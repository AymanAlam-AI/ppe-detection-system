import os
import time
import threading
from collections import deque
from datetime import datetime

import cv2
import numpy as np
from flask import Blueprint, Response, jsonify, request
from ultralytics import YOLO

MODEL_PATH   = r"C:\Users\ayman\PPE-Detection-System\ml_model\runs\detect\runs\train\ppe_model-4\weights\best.pt"
UPLOAD_DIR   = os.path.join(os.path.dirname(__file__), "live_uploads")
JPEG_QUALITY = 82
TARGET_FPS   = 30
FRAME_DELAY  = 1.0 / TARGET_FPS
MAX_EVENTS   = 50
NUM_CAMERAS  = 4

VIOLATION_CLASSES = {
    "no-helmet", "no_helmet",
    "no-vest",   "no_vest",
    "no-gloves", "no_gloves",
    "no-boots",  "no_boots",
}

CAMERA_META = {
    1: {"label": "CAM-01", "zone": "Main Entrance"},
    2: {"label": "CAM-02", "zone": "Zone B"},
    3: {"label": "CAM-03", "zone": "Rooftop Access"},
    4: {"label": "CAM-04", "zone": "Loading Bay"},
}

os.makedirs(UPLOAD_DIR, exist_ok=True)

live_bp     = Blueprint("live", __name__, url_prefix="/api/live")
_model      = None
_model_lock = threading.Lock()
_infer_lock = threading.Lock()


def _blank_stats():
    return {"fps": 0.0, "total_detections": 0, "violations": 0,
            "frame_count": 0, "safe_frames": 0, "elapsed": 0.0, "compliance_rate": 100.0}


_cams = {
    i: {
        "lock":         threading.Lock(),
        "output_frame": None,
        "is_streaming": False,
        "thread":       None,
        "stats":        _blank_stats(),
        "events":       deque(maxlen=MAX_EVENTS),
        "filename":     "",
    }
    for i in range(1, NUM_CAMERAS + 1)
}


def _get_model():
    global _model
    with _model_lock:
        if _model is None:
            _model = YOLO(MODEL_PATH)
            warmup = np.zeros((480, 640, 3), dtype=np.uint8)
            _model(warmup, device=0, half=True, verbose=False)
    return _model


def _draw_hud(frame, fps, det_count, viol_count, cam_id):
    meta  = CAMERA_META.get(cam_id, {})
    lines = [meta.get("label", f"CAM-0{cam_id}"), f"FPS {fps:.1f}  Det {det_count}  Viol {viol_count}"]
    font  = cv2.FONT_HERSHEY_SIMPLEX
    x, y0 = 10, 22
    for i, line in enumerate(lines):
        y     = y0 + i * 18
        scale = 0.45 if i > 0 else 0.48
        (w, h), _ = cv2.getTextSize(line, font, scale, 1)
        cv2.rectangle(frame, (x - 3, y - h - 3), (x + w + 3, y + 3), (8, 12, 16), -1)
        cv2.putText(frame, line, (x, y), font, scale, (240, 165, 0) if i == 0 else (220, 230, 243), 1, cv2.LINE_AA)


def _placeholder(cam_id):
    img         = np.full((480, 854, 3), 13, dtype=np.uint8)
    meta        = CAMERA_META.get(cam_id, {})
    text        = f"{meta.get('label', f'CAM-0{cam_id}')}  ·  {meta.get('zone', '')}  ·  No video"
    font        = cv2.FONT_HERSHEY_SIMPLEX
    (tw, th), _ = cv2.getTextSize(text, font, 0.6, 1)
    cv2.putText(img, text, ((854 - tw) // 2, (480 + th) // 2), font, 0.6, (60, 75, 95), 1, cv2.LINE_AA)
    return img


def _process_video(cam_id, path):
    cam         = _cams[cam_id]
    model       = _get_model()
    cap         = cv2.VideoCapture(path)
    frame_count = 0
    total_det   = 0
    total_viol  = 0
    safe_frames = 0
    start       = time.time()

    if not cap.isOpened():
        with cam["lock"]:
            cam["is_streaming"] = False
        return

    while True:
        with cam["lock"]:
            if not cam["is_streaming"]:
                break

        ret, frame = cap.read()

        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)
                continue

        t0     = time.perf_counter()
        h, w   = frame.shape[:2]
        scale  = 640 / max(h, w)
        resized = cv2.resize(frame, (int(w * scale), int(h * scale))) if scale < 1 else frame

        with _infer_lock:
            results = model(resized, device=0, half=True, imgsz=640, conf=0.3, verbose=False)[0]

        names      = results.names
        det_count  = len(results.boxes)
        viol_names = [
            names.get(int(cid), "unknown")
            for cid in results.boxes.cls.tolist()
            if names.get(int(cid), "").lower() in VIOLATION_CLASSES
        ]
        viol_count = len(viol_names)

        frame_count += 1
        total_det   += det_count
        total_viol  += viol_count
        if viol_count == 0:
            safe_frames += 1

        elapsed         = time.time() - start
        fps             = frame_count / max(elapsed, 1e-6)
        compliance_rate = round((safe_frames / frame_count) * 100, 1)

        annotated = results.plot()
        if scale < 1:
            annotated = cv2.resize(annotated, (w, h))
        _draw_hud(annotated, fps, det_count, viol_count, cam_id)

        if viol_count > 0:
            with cam["lock"]:
                cam["events"].append({
                    "time":    datetime.now().strftime("%H:%M:%S"),
                    "frame":   frame_count,
                    "count":   viol_count,
                    "classes": list(set(viol_names)),
                })

        with cam["lock"]:
            cam["output_frame"] = annotated.copy()
            cam["stats"] = {
                "fps":              round(fps, 1),
                "total_detections": total_det,
                "violations":       total_viol,
                "frame_count":      frame_count,
                "safe_frames":      safe_frames,
                "elapsed":          round(elapsed, 1),
                "compliance_rate":  compliance_rate,
            }

        gap = FRAME_DELAY - (time.perf_counter() - t0)
        if gap > 0:
            time.sleep(gap)

    cap.release()


def _generate(cam_id):
    blank = _placeholder(cam_id)
    cam   = _cams[cam_id]
    while True:
        with cam["lock"]:
            frame = cam["output_frame"].copy() if cam["output_frame"] is not None else blank
        ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
        if ok:
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n"
        time.sleep(FRAME_DELAY)


def _stop_camera(cam_id):
    cam = _cams[cam_id]
    with cam["lock"]:
        cam["is_streaming"] = False
        cam["output_frame"] = None
    if cam["thread"] and cam["thread"].is_alive():
        cam["thread"].join(timeout=3)


@live_bp.route("/upload/<int:cam_id>", methods=["POST"])
def upload(cam_id):
    if cam_id not in _cams:
        return jsonify({"error": f"Invalid camera ID {cam_id}."}), 400
    if "video" not in request.files or request.files["video"].filename == "":
        return jsonify({"error": "No video file provided."}), 400

    cam  = _cams[cam_id]
    file = request.files["video"]
    path = os.path.join(UPLOAD_DIR, f"stream_cam{cam_id}.mp4")
    file.save(path)

    _stop_camera(cam_id)

    with cam["lock"]:
        cam["stats"]        = _blank_stats()
        cam["filename"]     = file.filename
        cam["is_streaming"] = True
        cam["events"].clear()

    cam["thread"] = threading.Thread(target=_process_video, args=(cam_id, path), daemon=True)
    cam["thread"].start()

    return jsonify({"message": f"CAM-0{cam_id} stream started.", "filename": file.filename})


@live_bp.route("/stream/<int:cam_id>")
def stream(cam_id):
    if cam_id not in _cams:
        return jsonify({"error": "Invalid camera ID."}), 400
    return Response(
        _generate(cam_id),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0", "X-Accel-Buffering": "no"},
    )


@live_bp.route("/stats/<int:cam_id>")
def stats(cam_id):
    if cam_id not in _cams:
        return jsonify({"error": "Invalid camera ID."}), 400
    cam = _cams[cam_id]
    with cam["lock"]:
        data   = {**cam["stats"], "is_streaming": cam["is_streaming"], "filename": cam["filename"]}
        events = list(cam["events"])
    data["recent_events"] = list(reversed(events))[:20]
    return jsonify(data)

@live_bp.route("/cameras")
def cameras():
    result = []
    for cam_id, cam in _cams.items():
        meta = CAMERA_META.get(cam_id, {})
        with cam["lock"]:
            s = cam["stats"]
            result.append({
                "id":               cam_id,
                "label":            meta.get("label", f"CAM-0{cam_id}"),
                "zone":             meta.get("zone", ""),
                "is_streaming":     cam["is_streaming"],
                "filename":         cam["filename"],
                "compliance":       round(s.get("compliance_rate", 100.0), 1),
                "fps":              s.get("fps", 0.0),
                "violations":       s.get("violations", 0),
                "total_detections": s.get("total_detections", 0),
                "frame_count":      s.get("frame_count", 0),
                "safe_frames":      s.get("safe_frames", 0),
                "elapsed":          s.get("elapsed", 0.0),
            })
    return jsonify(result)

@live_bp.route("/stop/<int:cam_id>", methods=["POST"])
def stop(cam_id):
    if cam_id not in _cams:
        return jsonify({"error": "Invalid camera ID."}), 400
    _stop_camera(cam_id)
    _cams[cam_id]["filename"] = ""
    return jsonify({"message": f"CAM-0{cam_id} stopped."})


@live_bp.route("/stop/all", methods=["POST"])
def stop_all():
    for cam_id in _cams:
        _stop_camera(cam_id)
        _cams[cam_id]["filename"] = ""
    return jsonify({"message": "All cameras stopped."})