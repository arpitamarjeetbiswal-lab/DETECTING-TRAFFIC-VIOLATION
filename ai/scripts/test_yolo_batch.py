from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parents[2]

TEST_DIR = (
    BASE_DIR
    / "dataset"
    / "Traffic Violations Analysis Dataset"
    / "Test data"
)

OUTPUT_DIR = BASE_DIR / "ai" / "outputs" / "yolo_test"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

model = YOLO("yolov8n.pt")

images = list(TEST_DIR.rglob("*.jpg"))

print(f"Found {len(images)} test images")

for i, image_path in enumerate(images[:20], start=1):

    print(f"\n[{i}/20] Processing: {image_path.name}")

    results = model.predict(
        source=str(image_path),
        conf=0.35,
        save=True,
        project=str(OUTPUT_DIR),
        name="predictions",
        exist_ok=True,
        verbose=False
    )

print("\nYOLO batch test completed!")
print(f"Results saved in: {OUTPUT_DIR}")