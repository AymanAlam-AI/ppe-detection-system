import os
import sys
import threading
import uuid
from datetime import datetime

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ml_model"))
from database import VideoAnalysis, get_db
from inference import process_video, process_image

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
OUTPUT_FOLDER = os.path.join(os.path.dirname(__file__), "outputs")
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm"}
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "bmp"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

processing_progress = {}


def allowed_video(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS


def allowed_image(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


@app.route("/api/upload/video", methods=["POST"])
def upload_video():
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    file = request.files["video"]

    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    if not allowed_video(file.filename):
        return jsonify({"error": "Invalid file type. Allowed: mp4, avi, mov, mkv, webm"}), 400

    original_filename = secure_filename(file.filename)
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{unique_id}_{original_filename}"
    input_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(input_path)

    db = get_db()
    analysis = VideoAnalysis(filename=filename, original_filename=original_filename, status="pending", media_type="video")
    db.add(analysis)
    db.commit()
    video_id = analysis.id
    db.close()

    output_filename = f"output_{filename}"
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)

    thread = threading.Thread(
        target=_process_video_background,
        args=(video_id, input_path, output_path, output_filename),
        daemon=True,
    )
    thread.start()

    return jsonify({"success": True, "video_id": video_id, "filename": original_filename})


@app.route("/api/upload/image", methods=["POST"])
def upload_image():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]

    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    if not allowed_image(file.filename):
        return jsonify({"error": "Invalid file type. Allowed: jpg, jpeg, png, bmp"}), 400

    original_filename = secure_filename(file.filename)
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{unique_id}_{original_filename}"
    input_path = os.path.join(UPLOAD_FOLDER, filename)
    output_filename = f"output_{filename}"
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)
    file.save(input_path)

    detections, total_people, without_helmet, compliance_rate = process_image(input_path, output_path)

    total = len(detections)
    direct_violations = sum(1 for d in detections if d["is_violation"])
    compliant = total - direct_violations
    inferred_violations = without_helmet

    class_counts = {}
    for d in detections:
        class_counts[d["class"]] = class_counts.get(d["class"], 0) + 1

    db = get_db()
    analysis = VideoAnalysis(
        filename=filename,
        original_filename=original_filename,
        status="done",
        media_type="image",
        duration_seconds=0,
        total_frames=1,
        fps=0,
        total_detections=total,
        violations=direct_violations,
        compliant=compliant,
        compliance_rate=compliance_rate,
        processing_time=0,
        estimated_people=total_people,
        inferred_violations=inferred_violations,
        output_video_path=output_filename,
    )
    analysis.class_counts = class_counts
    analysis.violation_frames = []
    db.add(analysis)
    db.commit()
    image_id = analysis.id
    db.close()

    return jsonify({
        "success": True,
        "image_id": image_id,
        "detections": detections,
        "total_people": total_people,
        "without_helmet": without_helmet,
        "inferred_violations": inferred_violations,
        "compliance_rate": compliance_rate,
    })


def _process_video_background(video_id, input_path, output_path, output_filename):
    db = get_db()

    try:
        analysis = db.query(VideoAnalysis).filter_by(id=video_id).first()
        analysis.status = "processing"
        db.commit()

        stats = process_video(
            input_path,
            output_path,
            progress_callback=lambda pct: processing_progress.update({video_id: pct}),
        )

        analysis = db.query(VideoAnalysis).filter_by(id=video_id).first()
        analysis.status = "done"
        analysis.duration_seconds = stats["duration_seconds"]
        analysis.total_frames = stats["total_frames"]
        analysis.fps = stats["fps"]
        analysis.total_detections = stats["total_detections"]
        analysis.violations = stats["violations"]
        analysis.compliant = stats["compliant"]
        analysis.compliance_rate = stats.get("compliance_rate", 100)
        analysis.processing_time = stats["processing_time"]
        analysis.estimated_people = stats.get("estimated_people", 0)
        analysis.inferred_violations = stats.get("inferred_violations", 0)
        analysis.class_counts = stats["class_counts"]
        analysis.violation_frames = stats["violation_frames"]
        analysis.output_video_path = output_filename
        db.commit()

        processing_progress[video_id] = 100

    except Exception as e:
        analysis = db.query(VideoAnalysis).filter_by(id=video_id).first()
        if analysis:
            analysis.status = "error"
            db.commit()
        print(f"Processing error for video {video_id}: {e}")

    finally:
        db.close()


@app.route("/api/video/<int:video_id>/status", methods=["GET"])
def get_video_status(video_id):
    db = get_db()
    analysis = db.query(VideoAnalysis).filter_by(id=video_id).first()
    db.close()

    if not analysis:
        return jsonify({"error": "Video not found"}), 404

    return jsonify({
        "id": video_id,
        "status": analysis.status,
        "progress": processing_progress.get(video_id, 0),
        "original_filename": analysis.original_filename,
    })


@app.route("/api/video/<int:video_id>/result", methods=["GET"])
def get_video_result(video_id):
    db = get_db()
    analysis = db.query(VideoAnalysis).filter_by(id=video_id).first()
    db.close()

    if not analysis:
        return jsonify({"error": "Video not found"}), 404

    if analysis.status != "done":
        return jsonify({"error": f"Not ready. Status: {analysis.status}"}), 400

    return jsonify(analysis.to_dict())


@app.route("/api/video/<int:video_id>/download", methods=["GET"])
def download_output_video(video_id):
    db = get_db()
    analysis = db.query(VideoAnalysis).filter_by(id=video_id).first()
    db.close()

    if not analysis or not analysis.output_video_path:
        return jsonify({"error": "Output file not found"}), 404

    output_path = os.path.join(OUTPUT_FOLDER, analysis.output_video_path)

    if not os.path.exists(output_path):
        return jsonify({"error": "Output file missing"}), 404

    ext = analysis.output_video_path.rsplit(".", 1)[-1].lower()
    mimetype = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png" if ext == "png" else "video/mp4"

    return send_file(
        output_path,
        mimetype=mimetype,
        as_attachment=True,
        download_name=f"ppe_{analysis.original_filename}",
    )


@app.route("/api/video/<int:video_id>", methods=["DELETE"])
def delete_analysis(video_id):
    db = get_db()
    analysis = db.query(VideoAnalysis).filter_by(id=video_id).first()

    if not analysis:
        db.close()
        return jsonify({"error": "Analysis not found"}), 404

    input_path = os.path.join(UPLOAD_FOLDER, analysis.filename)
    if analysis.output_video_path:
        output_path = os.path.join(OUTPUT_FOLDER, analysis.output_video_path)
        if os.path.exists(output_path):
            os.remove(output_path)

    if os.path.exists(input_path):
        os.remove(input_path)

    db.delete(analysis)
    db.commit()
    db.close()

    if video_id in processing_progress:
        del processing_progress[video_id]

    return jsonify({"success": True, "deleted_id": video_id})


@app.route("/api/analyses", methods=["GET"])
def get_all_analyses():
    db = get_db()
    analyses = db.query(VideoAnalysis).order_by(VideoAnalysis.upload_time.desc()).all()
    db.close()

    return jsonify({"analyses": [a.to_dict() for a in analyses], "total": len(analyses)})


@app.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    db = get_db()
    analyses = db.query(VideoAnalysis).filter_by(status="done").all()
    db.close()

    if not analyses:
        return jsonify({
            "total_files": 0,
            "total_videos": 0,
            "total_images": 0,
            "total_workers_with_helmet": 0,
            "total_violations": 0,
            "average_compliance_rate": 0,
            "class_distribution": {},
            "recent_analyses": [],
        })

    total_videos = sum(1 for a in analyses if a.media_type == "video")
    total_images = sum(1 for a in analyses if a.media_type == "image")
    total_workers_with_helmet = sum(
        max(0, a.estimated_people - a.inferred_violations) for a in analyses
    )
    total_violations = sum(a.inferred_violations for a in analyses)
    avg_compliance = sum(a.compliance_rate for a in analyses) / len(analyses)

    class_distribution = {}
    for a in analyses:
        for cls, count in a.class_counts.items():
            class_distribution[cls] = class_distribution.get(cls, 0) + count

    return jsonify({
        "total_files": len(analyses),
        "total_videos": total_videos,
        "total_images": total_images,
        "total_workers_with_helmet": total_workers_with_helmet,
        "total_violations": total_violations,
        "average_compliance_rate": round(avg_compliance, 1),
        "class_distribution": class_distribution,
        "recent_analyses": [a.to_dict() for a in analyses[:5]],
    })


@app.route("/api/report/<int:video_id>", methods=["GET"])
def generate_report(video_id):
    db = get_db()
    analysis = db.query(VideoAnalysis).filter_by(id=video_id).first()
    db.close()

    if not analysis or analysis.status != "done":
        return jsonify({"error": "Analysis not found or incomplete"}), 404

    violation_frames = analysis.violation_frames
    total_frames = analysis.total_frames or 1

    report = {
        "report_title": f"PPE Compliance Report - {analysis.original_filename}",
        "generated_at": datetime.now().isoformat(),
        "video_info": {
            "filename": analysis.original_filename,
            "duration": f"{analysis.duration_seconds:.1f}s",
            "fps": analysis.fps,
            "total_frames": analysis.total_frames,
            "processed_on": analysis.upload_time.isoformat(),
        },
        "compliance_summary": {
            "overall_compliance_rate": f"{analysis.compliance_rate:.1f}%",
            "status": "PASS" if analysis.compliance_rate >= 80 else "FAIL",
            "total_detections": analysis.total_detections,
            "estimated_people": analysis.estimated_people,
            "workers_with_helmet": analysis.estimated_people - analysis.inferred_violations,
            "workers_without_helmet": analysis.inferred_violations,
        },
        "detection_breakdown": analysis.class_counts,
        "violation_timeline": {
            "violation_frame_count": len(violation_frames),
            "first_violation_frame": violation_frames[0] if violation_frames else None,
            "violation_density": f"{(len(violation_frames) / total_frames * 100):.1f}% of frames",
        },
        "processing_info": {
            "processing_time": f"{analysis.processing_time:.1f}s",
        },
    }

    return jsonify(report)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)