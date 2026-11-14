
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "ai" / "models" / "license_plate_detector.pt"
IMAGE_DIR = BASE_DIR / "ai" / "test_images"

model = YOLO(str(MODEL_PATH))

image_files = [
    p for p in IMAGE_DIR.iterdir()
    if p.suffix.lower() in [".jpg", ".jpeg", ".png"]
]

if not image_files:
    print("No test images found!")
    exit()

print("Starting number-plate detection...\n")

for image_path in image_files:
    results = model.predict(
        source=str(image_path),
        conf=0.25,
        save=True,
        verbose=False
    )

    print(f"\nImage: {image_path.name}")

    for result in results:
        if result.boxes is None or len(result.boxes) == 0:
            print("No number plate detected.")
            continue

        for box in result.boxes:
            confidence = float(box.conf[0])
            coordinates = box.xyxy[0].tolist()

            print(f"Plate detected: {confidence:.2%}")
            print("Coordinates:", coordinates)

print("\nDetection testing completed.")
