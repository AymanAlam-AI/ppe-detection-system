from ultralytics import YOLO

model = YOLO("yolov8n.pt")

model.train(
    data="C:/ppe/data.yaml",
    epochs=50,
    imgsz=640,
    batch=32,
    name="ppe_model",
    project="runs/train",
    patience=10,
    device="0",
    workers=0,
    cache="disk",
    verbose=True,
)