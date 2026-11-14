
from pathlib import Path
from datetime import datetime
import csv
import re
import cv2
import easyocr
from ultralytics import YOLO

# =====================================================
# 1. PROJECT PATHS
# =====================================================

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BASE_DIR / "ai" / "runs" / "plate_detection"
    / "test_training_v2" / "weights" / "best.pt"
)

IMAGE_DIR = BASE_DIR / "ai" / "test_images"
OUTPUT_DIR = BASE_DIR / "ai" / "outputs"

# Create unique output names to preserve previous results
RUN_ID = datetime.now().strftime("%Y%m%d_%H%M%S")

CROP_DIR = OUTPUT_DIR / f"plate_crops_{RUN_ID}"
PROCESSED_DIR = OUTPUT_DIR / f"plate_processed_{RUN_ID}"
CSV_PATH = OUTPUT_DIR / f"plate_ocr_results_{RUN_ID}.csv"

CROP_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp", ".webp"
}

# =====================================================
# 2. SETTINGS
# =====================================================

DETECTION_CONFIDENCE = 0.25
OCR_MIN_CONFIDENCE = 0.50
IMAGE_SIZE = 640

# Common Indian registration format.
# This is a screening rule, not proof of correctness.
PLATE_PATTERN = re.compile(
    r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$"
)

# =====================================================
# 3. LOAD MODELS
# =====================================================

print("\nLoading YOLO model...")

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"YOLO model not found: {MODEL_PATH}"
    )

model = YOLO(str(MODEL_PATH))

print("Loading EasyOCR...")
reader = easyocr.Reader(["en"], gpu=False)

print("Models loaded successfully.")

# =====================================================
# 4. IMAGE PREPROCESSING
# =====================================================

def preprocess_plate(crop):

    # Enlarge the detected plate
    enlarged = cv2.resize(
        crop,
        None,
        fx=3,
        fy=3,
        interpolation=cv2.INTER_CUBIC
    )

    # Convert to grayscale
    gray = cv2.cvtColor(
        enlarged,
        cv2.COLOR_BGR2GRAY
    )

    # Improve contrast using CLAHE
    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    enhanced = clahe.apply(gray)

    # Create threshold version
    threshold = cv2.adaptiveThreshold(
        enhanced,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11
    )

    return enlarged, enhanced, threshold


# =====================================================
# 5. OCR FUNCTION
# =====================================================

def read_plate(image):

    results = reader.readtext(
        image,
        allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        detail=1,
        paragraph=False
    )

    if not results:
        return "", 0.0

    text = "".join(
        item[1] for item in results
    ).upper()

    # Remove spaces and special characters
    text = re.sub(r"[^A-Z0-9]", "", text)

    if not text:
        return "", 0.0

    confidence = sum(
        float(item[2]) for item in results
    ) / len(results)

    return text, confidence


# =====================================================
# 6. NORMALIZE OCR TEXT
# =====================================================

def normalize_plate(text):

    text = re.sub(
        r"[^A-Z0-9]",
        "",
        text.upper()
    )

    # Sometimes OCR reads the IND marking
    # printed on the left side of an Indian plate.
    #
    # Remove IND only when the remaining text
    # matches the expected registration format.

    if text.startswith("IND"):

        without_ind = text[3:]

        if PLATE_PATTERN.fullmatch(without_ind):
            return without_ind

    return text


# =====================================================
# 7. SELECT OCR RESULT
# =====================================================

def select_best_result(results):

    candidates = []

    for name, text, confidence in results:

        corrected_text = normalize_plate(text)

        if (
            corrected_text
            and PLATE_PATTERN.fullmatch(corrected_text)
        ):

            candidates.append({
                "name": name,
                "text": corrected_text,
                "confidence": confidence
            })

    if not candidates:
        return "", 0.0, "UNREADABLE"

    # Check whether multiple OCR versions agree
    text_counts = {}

    for candidate in candidates:

        plate = candidate["text"]

        text_counts.setdefault(plate, []).append(
            candidate
        )

    # Prefer a result supported by multiple versions
    agreed = [
        (plate, matching)
        for plate, matching in text_counts.items()
        if len(matching) >= 2
    ]

    if agreed:

        plate, matching = max(
            agreed,
            key=lambda item: (
                len(item[1]),
                sum(x["confidence"] for x in item[1])
            )
        )

        confidence = max(
            x["confidence"] for x in matching
        )

        status = (
            "REVIEW_REQUIRED"
            if confidence >= OCR_MIN_CONFIDENCE
            else "LOW_CONFIDENCE"
        )

        return plate, confidence, status

    # If versions disagree, use the highest-confidence
    # format-matching result, but require manual review.
    best = max(
        candidates,
        key=lambda item: item["confidence"]
    )

    status = (
        "REVIEW_REQUIRED"
        if best["confidence"] >= OCR_MIN_CONFIDENCE
        else "LOW_CONFIDENCE"
    )

    return best["text"], best["confidence"], status


# =====================================================
# 8. PROCESS IMAGES
# =====================================================

if not IMAGE_DIR.exists():
    raise FileNotFoundError(
        f"Image directory not found: {IMAGE_DIR}"
    )

image_files = sorted(
    path for path in IMAGE_DIR.iterdir()
    if path.is_file()
    and path.suffix.lower() in IMAGE_EXTENSIONS
)

rows = []

print(f"\nFound {len(image_files)} images.")

for image_number, image_path in enumerate(
    image_files,
    start=1
):

    print(
        f"\n[{image_number}/{len(image_files)}] "
        f"{image_path.name}"
    )

    try:

        image = cv2.imread(str(image_path))

        if image is None:

            print("Image could not be read.")

            rows.append({
                "image": image_path.name,
                "plate_number": "",
                "detection_confidence": "",
                "ocr_confidence": "",
                "original_text": "",
                "enhanced_text": "",
                "threshold_text": "",
                "status": "IMAGE_READ_ERROR"
            })

            continue

        height, width = image.shape[:2]

        # Run YOLO plate detection
        prediction = model.predict(
            source=image,
            imgsz=IMAGE_SIZE,
            conf=DETECTION_CONFIDENCE,
            verbose=False
        )[0]

        if (
            prediction.boxes is None
            or len(prediction.boxes) == 0
        ):

            print("No number plate detected.")

            rows.append({
                "image": image_path.name,
                "plate_number": "",
                "detection_confidence": "",
                "ocr_confidence": "",
                "original_text": "",
                "enhanced_text": "",
                "threshold_text": "",
                "status": "NO_PLATE_DETECTED"
            })

            continue

        # Process every detected plate
        for detection_number, box in enumerate(
            prediction.boxes,
            start=1
        ):

            x1, y1, x2, y2 = map(
                int,
                box.xyxy[0].tolist()
            )

            # Keep coordinates inside image boundaries
            x1 = max(0, min(x1, width - 1))
            y1 = max(0, min(y1, height - 1))
            x2 = max(0, min(x2, width))
            y2 = max(0, min(y2, height))

            detection_conf = float(box.conf[0])

            if x2 <= x1 or y2 <= y1:
                continue

            crop = image[y1:y2, x1:x2]

            if crop.size == 0:
                continue

            # Preprocess the detected plate
            original, enhanced, threshold = (
                preprocess_plate(crop)
            )

            unique_name = (
                f"{image_path.stem}_plate_{detection_number}"
            )

            # Save original crop
            cv2.imwrite(
                str(CROP_DIR / f"{unique_name}.jpg"),
                crop
            )

            # Save processed versions
            cv2.imwrite(
                str(PROCESSED_DIR / f"{unique_name}_enlarged.jpg"),
                original
            )

            cv2.imwrite(
                str(PROCESSED_DIR / f"{unique_name}_enhanced.jpg"),
                enhanced
            )

            cv2.imwrite(
                str(PROCESSED_DIR / f"{unique_name}_threshold.jpg"),
                threshold
            )

            # Run OCR on all three versions
            original_text, original_conf = read_plate(
                original
            )

            enhanced_text, enhanced_conf = read_plate(
                enhanced
            )

            threshold_text, threshold_conf = read_plate(
                threshold
            )

            results = [
                ("original", original_text, original_conf),
                ("enhanced", enhanced_text, enhanced_conf),
                ("threshold", threshold_text, threshold_conf)
            ]

            # Select a candidate
            plate_number, ocr_conf, status = (
                select_best_result(results)
            )

            print(
                f"  Detection confidence: {detection_conf:.2f}"
            )

            print(
                f"  Original:   {original_text} "
                f"({original_conf:.2f})"
            )

            print(
                f"  Enhanced:   {enhanced_text} "
                f"({enhanced_conf:.2f})"
            )

            print(
                f"  Threshold:  {threshold_text} "
                f"({threshold_conf:.2f})"
            )

            print(
                f"  Selected:   "
                f"{plate_number or 'UNREADABLE'}"
            )

            print(f"  Status:     {status}")

            # Save results
            rows.append({
                "image": image_path.name,
                "plate_number": plate_number,
                "detection_confidence": round(
                    detection_conf, 4
                ),
                "ocr_confidence": round(
                    ocr_conf, 4
                ),
                "original_text": original_text,
                "enhanced_text": enhanced_text,
                "threshold_text": threshold_text,
                "status": status
            })

    except Exception as error:

        print(f"Error processing {image_path.name}: {error}")

        rows.append({
            "image": image_path.name,
            "plate_number": "",
            "detection_confidence": "",
            "ocr_confidence": "",
            "original_text": "",
            "enhanced_text": "",
            "threshold_text": "",
            "status": "PROCESSING_ERROR"
        })


# =====================================================
# 9. SAVE CSV
# =====================================================

fieldnames = [
    "image",
    "plate_number",
    "detection_confidence",
    "ocr_confidence",
    "original_text",
    "enhanced_text",
    "threshold_text",
    "status"
]

with open(
    CSV_PATH,
    "w",
    newline="",
    encoding="utf-8-sig"
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=fieldnames
    )

    writer.writeheader()
    writer.writerows(rows)


# =====================================================
# 10. FINAL SUMMARY
# =====================================================

total_records = len(rows)

review_count = sum(
    1 for row in rows
    if row["status"] == "REVIEW_REQUIRED"
)

unreadable_count = sum(
    1 for row in rows
    if row["status"] == "UNREADABLE"
)

no_plate_count = sum(
    1 for row in rows
    if row["status"] == "NO_PLATE_DETECTED"
)

print("\n============================================")
print("       FINAL OCR TEST COMPLETED")
print("============================================")

print(f"Images found:          {len(image_files)}")
print(f"Detection records:     {total_records}")
print(f"Review required:       {review_count}")
print(f"Unreadable:            {unreadable_count}")
print(f"No plate detected:     {no_plate_count}")

print("\nOUTPUT FILES")
print(f"CSV:       {CSV_PATH}")
print(f"Crops:     {CROP_DIR}")
print(f"Processed: {PROCESSED_DIR}")

print("\nIMPORTANT:")
print("OCR results are candidates, not verified plate numbers.")
print("Manually verify readings before database integration.")

print("\nTest finished successfully.")
