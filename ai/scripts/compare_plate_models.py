
from pathlib import Path
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[2]

DATASET = ROOT / "ai" / "datasets" / "number_plate_yolo" / "data.yaml"

MODELS = {
    "old_model": ROOT / "ai" / "models" / "license_plate_detector.pt",
    "new_model": ROOT / "ai" / "runs" / "plate_detection" / "test_training_v2" / "weights" / "best.pt"
}

for name, path in MODELS.items():
    print(f"\nEvaluating {name}...")

    if not path.exists():
        print(f"Model missing: {path}")
        continue

    model = YOLO(str(path))

    print("Model classes:", model.names)

    metrics = model.val(
        data=str(DATASET),
        split="test",
        imgsz=640,
        batch=4,
        device="cpu",
        workers=0,
        plots=False,
        project=str(ROOT / "ai" / "runs" / "plate_comparison"),
        name=name,
        exist_ok=False
    )

    print(f"\n{name} results:")
    print("Precision:", round(metrics.box.mp, 4))
    print("Recall:", round(metrics.box.mr, 4))
    print("mAP50:", round(metrics.box.map50, 4))
    print("mAP50-95:", round(metrics.box.map, 4))

print("\nComparison completed!")
