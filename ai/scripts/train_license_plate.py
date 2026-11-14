
from ultralytics import YOLO
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASET = PROJECT_ROOT / "ai" / "datasets" / "number_plate_yolo" / "data.yaml"
MODEL = PROJECT_ROOT / "ai" / "models" / "license_plate_yolov8n_pretrained.pt"

model = YOLO(str(MODEL))

results = model.train(
    data=str(DATASET),
    epochs=2,
    imgsz=640,
    batch=4,
    device="cpu",
    workers=0,
    project=str(PROJECT_ROOT / "ai" / "runs" / "plate_detection"),
    name="test_training_v2",
    exist_ok=False,
    patience=5,
    plots=False,
    save=True,
    save_period=1
)

print("\nTraining completed!")
print("Best model:", results.save_dir / "weights" / "best.pt")
print("Last model:", results.save_dir / "weights" / "last.pt")
