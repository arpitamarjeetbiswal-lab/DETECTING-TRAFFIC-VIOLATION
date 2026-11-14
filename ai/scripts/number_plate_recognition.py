
from pathlib import Path
import re
import cv2
import easyocr
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "ai" / "models" / "license_plate_detector.pt"
IMAGE_DIR = BASE_DIR / "ai" / "test_images"
OUTPUT_DIR = BASE_DIR / "ai" / "outputs" / "number_plates"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Load models once
print("Loading YOLO model...")
detector = YOLO(str(MODEL_PATH))

print("Loading EasyOCR...")
reader = easyocr.Reader(["en"], gpu=False)

# Indian vehicle registration format (basic pattern)
PLATE_PATTERN = re.compile(
    r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$"
)

image_files = [
    p for p in IMAGE_DIR.iterdir()
    if p.suffix.lower() in [".jpg", ".jpeg", ".png"]
]

for image_path in image_files:

    image = cv2.imread(str(image_path))

    if image is None:
        print("Could not load:", image_path.name)
        continue

    results = detector.predict(
        source=image,
        conf=0.8,
        verbose=False
    )

    print("\nImage:", image_path.name)

    for result in results:

        if result.boxes is None or len(result.boxes) == 0:
            print("No number plate detected.")
            continue

        for index, box in enumerate(result.boxes):

            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

            # Keep crop coordinates within image boundaries
            h, w = image.shape[:2]
            x1, x2 = max(0, x1), min(w, x2)
            y1, y2 = max(0, y1), min(h, y2)

            plate_crop = image[y1:y2, x1:x2]

            if plate_crop.size == 0:
                continue

            # OCR
            ocr_results = reader.readtext(plate_crop)

            detected_plate = None
            best_confidence = 0

            for _, text, confidence in ocr_results:

                cleaned = re.sub(
                    r"[^A-Z0-9]",
                    "",
                    text.upper()
                )

                if (
                    PLATE_PATTERN.fullmatch(cleaned)
                    and confidence >= 0.40
                ):
                    if confidence > best_confidence:
                        detected_plate = cleaned
                        best_confidence = confidence

            if detected_plate:
                print(
                    f"Number Plate: {detected_plate} "
                    f"| OCR Confidence: {best_confidence:.2%}"
                )
            else:
                print("Plate detected, but registration text not recognized.")

            # Draw detection box
            cv2.rectangle(
                image,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )

            label = detected_plate or "Plate not recognized"

            cv2.putText(
                image,
                label,
                (x1, max(25, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

    output_path = OUTPUT_DIR / image_path.name
    cv2.imwrite(str(output_path), image)

    print("Saved:", output_path)

print("\nNumber plate recognition testing completed.")
