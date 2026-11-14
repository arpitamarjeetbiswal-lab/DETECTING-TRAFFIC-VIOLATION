
from pathlib import Path
import csv
import cv2
import easyocr
from ultralytics import YOLO

# ==========================================
# PROJECT PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BASE_DIR / "ai" / "runs" / "plate_detection"
    / "test_training_v2" / "weights" / "best.pt"
)

IMAGE_DIR = BASE_DIR / "ai" / "test_images"
OUTPUT_DIR = BASE_DIR / "ai" / "outputs"

CROP_DIR = OUTPUT_DIR / "plate_ocr_preprocess_crops"

ORIGINAL_DIR = CROP_DIR / "original"
ENHANCED_DIR = CROP_DIR / "enhanced"
THRESHOLD_DIR = CROP_DIR / "threshold"

CSV_PATH = OUTPUT_DIR / "plate_ocr_preprocess_results.csv"

# Create folders without deleting existing files
for folder in [ORIGINAL_DIR, ENHANCED_DIR, THRESHOLD_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# ==========================================
# LOAD MODELS
# ==========================================

print("Loading YOLO model...")
model = YOLO(str(MODEL_PATH))

print("Loading EasyOCR...")
reader = easyocr.Reader(["en"], gpu=False)

# ==========================================
# UNIQUE FILE NAME
# ==========================================

def get_unique_path(folder, filename):
    path = folder / filename
    counter = 1

    while path.exists():
        path = folder / (
            f"{Path(filename).stem}_{counter}.jpg"
        )
        counter += 1

    return path

# ==========================================
# IMAGE PREPROCESSING
# ==========================================

def preprocess_plate(crop):

    # Enlarge the plate
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

    # Improve local contrast
    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    enhanced = clahe.apply(gray)

    # Adaptive threshold
    threshold = cv2.adaptiveThreshold(
        enhanced,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11
    )

    return enlarged, enhanced, threshold

# ==========================================
# OCR FUNCTION
# ==========================================

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
    )

    text = "".join(
        char for char in text.upper()
        if char.isalnum()
    )

    confidence = sum(
        float(item[2]) for item in results
    ) / len(results)

    return text, confidence

# ==========================================
# FIND TEST IMAGES
# ==========================================

image_files = sorted(
    p for p in IMAGE_DIR.iterdir()
    if p.is_file()
    and p.suffix.lower() in IMAGE_EXTENSIONS
)

rows = []

print(f"\nFound {len(image_files)} images.\n")

# ==========================================
# MAIN PROCESSING
# ==========================================

for image_number, image_path in enumerate(
    image_files, start=1
):

    print(
        f"[{image_number}/{len(image_files)}] "
        f"{image_path.name}"
    )

    image = cv2.imread(str(image_path))

    if image is None:
        print("  Image read error.")

        rows.append({
            "image": image_path.name,
            "detection": "",
            "detection_confidence": "",
            "original_text": "",
            "original_confidence": "",
            "enhanced_text": "",
            "enhanced_confidence": "",
            "threshold_text": "",
            "threshold_confidence": "",
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

        rows.append({
            "image": image_path.name,
            "detection": "",
            "detection_confidence": "",
            "original_text": "",
            "original_confidence": "",
            "enhanced_text": "",
            "enhanced_confidence": "",
            "threshold_text": "",
            "threshold_confidence": "",
            "status": "NO_PLATE_DETECTED"
        })

        continue

    for detection_number, box in enumerate(
        prediction.boxes, start=1
    ):

        x1, y1, x2, y2 = map(
            int,
            box.xyxy[0].tolist()
        )

        # Keep coordinates inside the image
        x1 = max(0, min(x1, width - 1))
        y1 = max(0, min(y1, height - 1))
        x2 = max(0, min(x2, width))
        y2 = max(0, min(y2, height))

        confidence = float(box.conf[0])

        if x2 <= x1 or y2 <= y1:
            continue

        # Extract detected plate
        crop = image[y1:y2, x1:x2]

        # Generate three versions
        original, enhanced, threshold = preprocess_plate(crop)

        # ==================================
        # SAVE ALL THREE IMAGE VERSIONS
        # ==================================

        crop_name = (
            f"{image_path.stem}_plate_{detection_number}.jpg"
        )

        original_path = get_unique_path(
            ORIGINAL_DIR, crop_name
        )

        enhanced_path = get_unique_path(
            ENHANCED_DIR, crop_name
        )

        threshold_path = get_unique_path(
            THRESHOLD_DIR, crop_name
        )

        cv2.imwrite(str(original_path), crop)
        cv2.imwrite(str(enhanced_path), enhanced)
        cv2.imwrite(str(threshold_path), threshold)

        # ==================================
        # OCR ON ALL THREE VERSIONS
        # ==================================

        original_text, original_conf = read_plate(original)

        enhanced_text, enhanced_conf = read_plate(enhanced)

        threshold_text, threshold_conf = read_plate(threshold)

        print(f"  Plate {detection_number}")
        print(
            f"  Original:   {original_text or 'UNREADABLE'} "
            f"({original_conf:.2f})"
        )
        print(
            f"  Enhanced:   {enhanced_text or 'UNREADABLE'} "
            f"({enhanced_conf:.2f})"
        )
        print(
            f"  Threshold:  {threshold_text or 'UNREADABLE'} "
            f"({threshold_conf:.2f})"
        )

        # ==================================
        # SAVE RESULTS
        # ==================================

        rows.append({
            "image": image_path.name,
            "detection": detection_number,
            "detection_confidence": round(confidence, 4),

            "original_text": original_text,
            "original_confidence": round(original_conf, 4),

            "enhanced_text": enhanced_text,
            "enhanced_confidence": round(enhanced_conf, 4),

            "threshold_text": threshold_text,
            "threshold_confidence": round(threshold_conf, 4),

            "status": "OCR_TESTED"
        })

# ==========================================
# SAVE CSV
# ==========================================

fieldnames = [
    "image",
    "detection",
    "detection_confidence",
    "original_text",
    "original_confidence",
    "enhanced_text",
    "enhanced_confidence",
    "threshold_text",
    "threshold_confidence",
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

# ==========================================
# FINAL REPORT
# ==========================================

print("\n========== OCR PREPROCESSING TEST COMPLETED ==========")

print(f"Images processed: {len(image_files)}")
print(f"Detection records: {len(rows)}")

print(f"\nOriginal crops: {ORIGINAL_DIR}")
print(f"Enhanced crops: {ENHANCED_DIR}")
print(f"Threshold crops: {THRESHOLD_DIR}")

print(f"\nCSV saved: {CSV_PATH}")
