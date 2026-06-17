import cv2
import os
from ultralytics import YOLO
from datetime import datetime

MODEL_PATH = r"C:\Users\ayman\PPE-Detection-System\ml_model\runs\detect\runs\train\ppe_model-4\weights\best.pt"
PERSON_MODEL_PATH = r"C:\Users\ayman\PPE-Detection-System\ml_model\yolov8n.pt"

ppe_model = YOLO(MODEL_PATH)
person_model = YOLO(PERSON_MODEL_PATH)

VIOLATION_CLASSES = ["no helmet", "no vest", "no gloves"]

CLASS_COLORS = {
    "helmet": (0, 255, 0),
    "safety vest": (0, 255, 0),
    "no helmet": (0, 0, 255),
    "no vest": (0, 0, 255),
    "gloves": (0, 255, 0),
    "goggles": (255, 255, 0),
    "dust mask": (255, 165, 0),
}


def _is_violation(class_name):
    return any(v.lower() in class_name.lower() for v in VIOLATION_CLASSES)


def _draw_detection(frame, x1, y1, x2, y2, class_name, confidence, color):
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    label = f"{class_name} {confidence:.2f}"
    label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
    cv2.rectangle(frame, (x1, y1 - label_size[1] - 10), (x1 + label_size[0], y1), color, -1)
    cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)


def _box_center(box):
    x1, y1, x2, y2 = map(int, box.xyxy[0])
    return ((x1 + x2) // 2, (y1 + y2) // 2)


def _is_inside(px, py, x1, y1, x2, y2, margin=60):
    return (x1 - margin) <= px <= (x2 + margin) and (y1 - margin) <= py <= (y2 + margin)


def _count_violations(person_boxes, ppe_boxes, ppe_names):
    people_with_helmet = set()
    people_with_vest = set()

    for ppe_box in ppe_boxes:
        class_name = ppe_names[int(ppe_box.cls[0])].lower()
        px, py = _box_center(ppe_box)

        for i, person_box in enumerate(person_boxes):
            x1, y1, x2, y2 = map(int, person_box.xyxy[0])
            if _is_inside(px, py, x1, y1, x2, y2):
                if class_name == "helmet":
                    people_with_helmet.add(i)
                if class_name == "safety vest":
                    people_with_vest.add(i)

    total_people = len(person_boxes)
    without_helmet = total_people - len(people_with_helmet)
    without_vest = total_people - len(people_with_vest)

    return total_people, without_helmet, without_vest, people_with_helmet


def _draw_person_boxes(frame, person_boxes, people_with_helmet):
    for i, box in enumerate(person_boxes):
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        has_helmet = i in people_with_helmet
        color = (0, 255, 0) if has_helmet else (0, 0, 255)
        label = "helmet on" if has_helmet else "no helmet"
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)[0]
        cv2.rectangle(frame, (x1, y1 - label_size[1] - 8), (x1 + label_size[0], y1), color, -1)
        cv2.putText(frame, label, (x1, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)


def process_video(input_path, output_path, progress_callback=None):
    cap = cv2.VideoCapture(input_path)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    stats = {
        "total_frames": total_frames,
        "processed_frames": 0,
        "fps": fps,
        "duration_seconds": round(duration, 2),
        "total_detections": 0,
        "violations": 0,
        "compliant": 0,
        "estimated_people": 0,
        "inferred_violations": 0,
        "class_counts": {},
        "violation_frames": [],
        "processing_time": None,
        "timestamp": datetime.now().isoformat(),
    }

    start_time = datetime.now()
    frame_number = 0
    SKIP_FRAMES = 2
    peak_people = 0
    peak_violations = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_number += 1

        if frame_number % SKIP_FRAMES != 0:
            out.write(frame)
            continue

        person_results = person_model(frame, conf=0.4, classes=[0], verbose=False)
        ppe_results = ppe_model(frame, conf=0.25, verbose=False)

        person_boxes = []
        for r in person_results:
            if r.boxes is not None:
                person_boxes.extend(r.boxes)

        ppe_boxes = []
        for r in ppe_results:
            if r.boxes is not None:
                ppe_boxes.extend(r.boxes)

        total_people, without_helmet, without_vest, people_with_helmet = _count_violations(
            person_boxes, ppe_boxes, ppe_model.names
        )

        if total_people > peak_people:
            peak_people = total_people
        if without_helmet > peak_violations:
            peak_violations = without_helmet

        frame_has_violation = without_helmet > 0

        for ppe_box in ppe_boxes:
            x1, y1, x2, y2 = map(int, ppe_box.xyxy[0])
            confidence = float(ppe_box.conf[0])
            class_name = ppe_model.names[int(ppe_box.cls[0])]

            stats["total_detections"] += 1
            stats["class_counts"][class_name] = stats["class_counts"].get(class_name, 0) + 1

            if _is_violation(class_name):
                stats["violations"] += 1
            else:
                stats["compliant"] += 1

            color = CLASS_COLORS.get(class_name, (255, 255, 255))
            _draw_detection(frame, x1, y1, x2, y2, class_name, confidence, color)

        _draw_person_boxes(frame, person_boxes, people_with_helmet)

        if frame_has_violation:
            stats["violation_frames"].append(frame_number)

        cv2.putText(frame, f"People: {total_people} | Without helmet: {without_helmet}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        out.write(frame)
        stats["processed_frames"] += 1

        if progress_callback:
            progress_callback(int((frame_number / total_frames) * 100))

    cap.release()
    out.release()

    helmets_detected = stats["class_counts"].get("helmet", 0)
    stats["estimated_people"] = peak_people
    stats["inferred_violations"] = peak_violations
    stats["processing_time"] = round((datetime.now() - start_time).total_seconds(), 2)
    stats["compliance_rate"] = round(
        ((peak_people - peak_violations) / peak_people * 100) if peak_people > 0 else 100, 1
    )

    return stats


def process_image(input_path, output_path):
    img = cv2.imread(input_path)

    person_results = person_model(img, conf=0.4, classes=[0], verbose=False)
    ppe_results = ppe_model(img, conf=0.25, verbose=False)

    person_boxes = []
    for r in person_results:
        if r.boxes is not None:
            person_boxes.extend(r.boxes)

    ppe_boxes = []
    for r in ppe_results:
        if r.boxes is not None:
            ppe_boxes.extend(r.boxes)

    total_people, without_helmet, without_vest, people_with_helmet = _count_violations(
        person_boxes, ppe_boxes, ppe_model.names
    )

    detections = []
    for ppe_box in ppe_boxes:
        x1, y1, x2, y2 = map(int, ppe_box.xyxy[0])
        confidence = float(ppe_box.conf[0])
        class_name = ppe_model.names[int(ppe_box.cls[0])]
        violation = _is_violation(class_name)
        color = CLASS_COLORS.get(class_name, (255, 255, 255))

        _draw_detection(img, x1, y1, x2, y2, class_name, confidence, color)

        detections.append({
            "class": class_name,
            "confidence": round(confidence, 3),
            "is_violation": violation,
            "bbox": [x1, y1, x2, y2],
        })

    _draw_person_boxes(img, person_boxes, people_with_helmet)

    compliance_rate = round(
        ((total_people - without_helmet) / total_people * 100) if total_people > 0 else 100, 1
    )

    cv2.imwrite(output_path, img)
    return detections, total_people, without_helmet, compliance_rate