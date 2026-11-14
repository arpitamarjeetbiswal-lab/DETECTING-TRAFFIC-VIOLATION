
import cv2
import easyocr
import csv
from pathlib import Path
from ultralytics import YOLO

# Project paths
BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "ai" / "runs" / "plate_detection" / "test_training_v2" / "weights" / "best.pt"
IMAGE_DIR = BASE_DIR / "ai" / "test_images"

OUTPUT_DIR = BASE_DIR / "ai" / "outputs" / "plate_ocr_crops_conf50"
CSV_PATH = BASE_DIR / "ai" / "outputs" / "plate_ocr_results_conf50.csv"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Load models
print("Loading YOLO model...")
model = YOLO(str(MODEL_PATH))

print("Loading EasyOCR...")
reader = easyocr.Reader(["en"], gpu=False)

# Supported image formats
extensions = {".jpg", ".jpeg", ".png", ".bmp"}

image_files = [
    p for p in IMAGE_DIR.iterdir()
    if p.is_file() and p.suffix.lower() in extensions
]

results_data = []
detection_count = 0

print(f"\nFound {len(image_files)} images.")
print("Starting YOLO + OCR test with confidence 0.50...\n")

for image_path in image_files:
    image = cv2.imread(str(image_path))

    if image is None:
        print(f"Could not read: {image_path.name}")
        continue

    predictions = model.predict(
        source=image,
        imgsz=640,
        conf=0.50,
        iou=0.45,
        verbose=False
    )

    result = predictions[0]

    if result.boxes is None or len(result.boxes) == 0:
        results_data.append([
            image_path.name, "NO_DETECTION", "", ""
        ])
        print(f"{image_path.name}: NO DETECTION")
        continue

    for index, box in enumerate(result.boxes):
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        detection_confidence = float(box.conf[0])

        height, width = image.shape[:2]

        x1 = max(0, min(x1, width))
        x2 = max(0, min(x2, width))
        y1 = max(0, min(y1, height))
        y2 = max(0, min(y2, height))

        crop = image[y1:y2, x1:x2]

        if crop.size == 0:
            continue

        detection_count += 1

        crop_name = (
            f"{image_path.stem}_detection_{index + 1}.jpg"
        )
        crop_path = OUTPUT_DIR / crop_name

        cv2.imwrite(str(crop_path), crop)

        # OCR
        ocr_results = reader.readtext(
            crop,
            allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        )

        detected_text = "".join(
            item[1].upper().replace(" ", "")
            for item in ocr_results
        )

        ocr_confidence = (
            max(item[2] for item in ocr_results)
            if ocr_results else 0.0
        )

        status = "TEXT_FOUND" if detected_text else "UNREADABLE"

        results_data.append([
            image_path.name,
            status,
            detected_text,
            round(detection_confidence, 4),
            round(ocr_confidence, 4),
            str(crop_path)
        ])

        print(
            f"{image_path.name} | "
            f"YOLO: {detection_confidence:.2f} | "
            f"OCR: {detected_text or 'UNREADABLE'} | "
            f"OCR confidence: {ocr_confidence:.2f}"
        )

# Save CSV
with open(CSV_PATH, "w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)

    writer.writerow([
        "image_name",
        "status",
        "plate_text",
        "yolo_confidence",
        "ocr_confidence",
        "crop_path"
    ])

    writer.writerows(results_data)

print("\n========== TEST COMPLETED ==========")
print(f"Images processed: {len(image_files)}")
print(f"Detections: {detection_count}")
print(f"CSV saved: {CSV_PATH}")
print(f"Crops saved: {OUTPUT_DIR}")
