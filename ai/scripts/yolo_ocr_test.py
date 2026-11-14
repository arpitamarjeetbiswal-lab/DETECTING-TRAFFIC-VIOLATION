from pathlib import Path
import csv
import cv2
import easyocr
from ultralytics import YOLO

# Project paths
BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BASE_DIR
    / "ai"
    / "runs"
    / "plate_detection"
    / "test_training_v2"
    / "weights"
    / "best.pt"
)

IMAGE_DIR = BASE_DIR / "ai" / "test_images"
OUTPUT_DIR = BASE_DIR / "ai" / "outputs"

CROP_DIR = OUTPUT_DIR / "plate_ocr_crops_retest3"
CSV_PATH = OUTPUT_DIR / "plate_ocr_results.csv"

# Create new output folders without deleting existing files
CROP_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Supported image formats
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

print("Loading YOLO model...")
model = YOLO(str(MODEL_PATH))

print("Loading EasyOCR...")
reader = easyocr.Reader(["en"], gpu=False)

results_rows = []

image_files = sorted(
    path for path in IMAGE_DIR.iterdir()
    if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
)

print(f"\nFound {len(image_files)} images.\n")

for image_number, image_path in enumerate(image_files, start=1):
    print(f"[{image_number}/{len(image_files)}] Processing: {image_path.name}")

    image = cv2.imread(str(image_path))

    if image is None:
        print("  Could not read image.")
        results_rows.append({
            "image": image_path.name,
            "detection": "",
            "detection_confidence": "",
            "ocr_text": "",
            "ocr_confidence": "",
            "bbox": "",
            "status": "IMAGE_READ_ERROR"
        })
        continue

    height, width = image.shape[:2]

    prediction = model.predict(
        source=image,
        imgsz=640,
        conf=0.25,
        verbose=False
    )[0]

    if prediction.boxes is None or len(prediction.boxes) == 0:
        print("  No plate detected.")
        results_rows.append({
            "image": image_path.name,
            "detection": "",
            "detection_confidence": "",
            "ocr_text": "",
            "ocr_confidence": "",
            "bbox": "",
            "status": "NO_PLATE_DETECTED"
        })
        continue

    for detection_number, box in enumerate(prediction.boxes, start=1):
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

        # Keep crop coordinates inside the original image
        x1 = max(0, min(x1, width - 1))
        y1 = max(0, min(y1, height - 1))
        x2 = max(0, min(x2, width))
        y2 = max(0, min(y2, height))

        confidence = float(box.conf[0])

        if x2 <= x1 or y2 <= y1:
            results_rows.append({
                "image": image_path.name,
                "detection": detection_number,
                "detection_confidence": round(confidence, 4),
                "ocr_text": "",
                "ocr_confidence": "",
                "bbox": f"{x1},{y1},{x2},{y2}",
                "status": "INVALID_CROP"
            })
            continue

        plate_crop = image[y1:y2, x1:x2]

        crop_name = (
            f"{image_path.stem}_plate_{detection_number}.jpg"
        )
        crop_path = CROP_DIR / crop_name

        # Avoid overwriting an existing crop
        counter = 1
        while crop_path.exists():
            crop_name = (
                f"{image_path.stem}_plate_{detection_number}_{counter}.jpg"
            )
            crop_path = CROP_DIR / crop_name
            counter += 1

        cv2.imwrite(str(crop_path), plate_crop)

        # OCR on the detected plate crop
        ocr_results = reader.readtext(
            plate_crop,
            allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
            detail=1,
            paragraph=False
        )

        if ocr_results:
            raw_text = "".join(item[1] for item in ocr_results)
            normalized_text = "".join(
                char for char in raw_text.upper()
                if char.isalnum()
            )

            ocr_confidence = max(
                float(item[2]) for item in ocr_results
            )

            status = (
                "OCR_TEXT_FOUND"
                if normalized_text
                else "UNREADABLE"
            )
        else:
            normalized_text = ""
            ocr_confidence = ""
            status = "UNREADABLE"

        results_rows.append({
            "image": image_path.name,
            "detection": detection_number,
            "detection_confidence": round(confidence, 4),
            "ocr_text": normalized_text,
            "ocr_confidence": (
                round(ocr_confidence, 4)
                if ocr_confidence != "" else ""
            ),
            "bbox": f"{x1},{y1},{x2},{y2}",
            "status": status
        })

        print(
            f"  Plate {detection_number}: "
            f"{normalized_text or 'UNREADABLE'}"
        )

# Save results to CSV
fieldnames = [
    "image",
    "detection",
    "detection_confidence",
    "ocr_text",
    "ocr_confidence",
    "bbox",
    "status"
]

with open(CSV_PATH, "w", newline="", encoding="utf-8-sig") as csv_file:
    writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(results_rows)

print("\n========== TEST COMPLETED ==========")
print(f"Images processed: {len(image_files)}")
print(f"Detection records: {len(results_rows)}")
print(f"CSV saved at: {CSV_PATH}")
print(f"Plate crops saved at: {CROP_DIR}")