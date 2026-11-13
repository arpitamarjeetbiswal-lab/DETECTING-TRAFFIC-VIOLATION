from pathlib import Path
import os
import re

import cv2
import easyocr
import torch
from ultralytics import YOLO

# =====================================================
# 1. PROJECT PATHS
# =====================================================

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


# =====================================================
# 2. SETTINGS
# =====================================================

DETECTION_CONFIDENCE = 0.25
OCR_MIN_CONFIDENCE = 0.50

PLATE_PATTERN = re.compile(
    r"^(?:[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}|[A-Z]{3}[0-9]{7})$"
)


# =====================================================
# 3. LAZY MODEL LOADING
# =====================================================

_plate_model = None
_ocr_reader = None


def get_plate_model():

    global _plate_model

    if _plate_model is None:

        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Plate model not found: {MODEL_PATH}")

        _plate_model = YOLO(str(MODEL_PATH))

    return _plate_model


def get_ocr_reader():

    global _ocr_reader

    if _ocr_reader is None:
        gpu_setting = os.getenv("EASYOCR_GPU", "auto").strip().lower()
        use_gpu = (
            gpu_setting not in {"0", "false", "no", "off", "cpu"}
            and torch.cuda.is_available()
        )

        try:
            _ocr_reader = easyocr.Reader(["en"], gpu=use_gpu)
        except Exception as error:
            if not use_gpu:
                raise

            print(
                "EasyOCR GPU initialization failed; falling back to CPU:",
                error
            )
            _ocr_reader = easyocr.Reader(["en"], gpu=False)

    return _ocr_reader


# =====================================================
# 4. NORMALIZE PLATE TEXT
# =====================================================


def normalize_plate(text):

    text = re.sub(r"[^A-Z0-9]", "", text.upper())

    if text.startswith("IND"):

        without_ind = text[3:]

        if PLATE_PATTERN.fullmatch(without_ind):
            return without_ind

    if text.endswith("IND"):
        without_ind = text[:-3]
        if PLATE_PATTERN.fullmatch(without_ind):
            return without_ind

    return text


# =====================================================
# 5. READ NUMBER PLATE
# =====================================================


def read_text_region(reader, image, allowlist):

    enlarged = cv2.resize(
        image,
        None,
        fx=4,
        fy=4,
        interpolation=cv2.INTER_CUBIC
    )

    results = reader.readtext(
        enlarged,
        allowlist=allowlist,
        detail=1,
        paragraph=False,
    )

    if not results:
        return "", 0.0

    results = sorted(
        results,
        key=lambda item: (
            sum(point[1] for point in item[0]) / 4,
            sum(point[0] for point in item[0]) / 4,
        ),
    )

    text = normalize_plate(
        "".join(item[1] for item in results)
    )
    confidence = sum(float(item[2]) for item in results) / len(results)

    return text, confidence


def read_plate(crop):

    if crop is None or crop.size == 0:
        return "", 0.0

    # Enlarge the plate 3 times
    enlarged = cv2.resize(crop, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)

    reader = get_ocr_reader()

    results = reader.readtext(
        enlarged,
        allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        detail=1,
        paragraph=False,
    )

    if results:
        # Sort detected text regions approximately
        # from top to bottom, then left to right.
        results = sorted(
            results,
            key=lambda item: (
                sum(point[1] for point in item[0]) / 4,
                sum(point[0] for point in item[0]) / 4,
            ),
        )

        text = normalize_plate(
            "".join(item[1] for item in results)
        )

        confidence = (
            sum(float(item[2]) for item in results) / len(results)
        )
    else:
        text = ""
        confidence = 0.0

    if PLATE_PATTERN.fullmatch(text):
        return text, confidence

    # Retry malformed reads on a contrast-enhanced grayscale crop.
    # Keep the raw read unless the alternate pass matches a known format.
    grayscale = (
        cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        if crop.ndim == 3
        else crop
    )
    enhanced = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    ).apply(grayscale)

    enhanced_text, enhanced_confidence = read_text_region(
        reader,
        enhanced,
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    )

    if PLATE_PATTERN.fullmatch(enhanced_text):
        return enhanced_text, enhanced_confidence

    if enhanced_confidence > confidence:
        text, confidence = enhanced_text, enhanced_confidence

    # Some plates place four small registration digits in a narrow
    # left column and the three-letter prefix plus serial on the right.
    # Read those regions separately so the small country/date markings
    # do not get mixed into the main text.
    width = crop.shape[1]
    side_width = int(width * 0.25)

    if side_width < 8 or width - side_width < 12:
        return text, confidence

    side_digits, side_confidence = read_text_region(
        reader,
        crop[:, :side_width],
        "0123456789"
    )

    main_text, main_confidence = read_text_region(
        reader,
        crop[:, side_width:],
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    )

    if (
        re.fullmatch(r"[0-9]{4}", side_digits)
        and re.fullmatch(r"[A-Z]{3}[0-9]{3,4}", main_text)
    ):
        combined_text = (
            main_text[:3]
            + side_digits
            + main_text[3:]
        )

        if PLATE_PATTERN.fullmatch(combined_text):
            confidence = (
                side_confidence + main_confidence
            ) / 2

            return combined_text, confidence

    return text, confidence


def plate_matches_motorcycle(plate_box, motorcycle_boxes, minimum_overlap=0.5):

    px1, py1, px2, py2 = plate_box
    plate_area = max(1, px2 - px1) * max(1, py2 - py1)

    for motorcycle_box in motorcycle_boxes:
        bx1, by1, bx2, by2 = motorcycle_box
        overlap_width = max(0, min(px2, bx2) - max(px1, bx1))
        overlap_height = max(0, min(py2, by2) - max(py1, by1))

        if (overlap_width * overlap_height) / plate_area >= minimum_overlap:
            return True

    return False


# =====================================================
# 6. DETECT PLATES AND READ TEXT
# =====================================================


def detect_and_read_plates(image, motorcycle_boxes=None):

    if image is None:
        raise ValueError("Invalid image received.")

    if not hasattr(image, "shape") or len(image.shape) < 2:
        raise ValueError("Invalid image format.")

    height, width = image.shape[:2]

    if height == 0 or width == 0:
        raise ValueError("Empty image received.")

    model = get_plate_model()

    prediction = model.predict(
        source=image, imgsz=640, conf=DETECTION_CONFIDENCE, verbose=False
    )[0]

    plate_results = []

    if prediction.boxes is None:
        return plate_results

    for box in prediction.boxes:

        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

        # Add a small margin around the detected plate
        pad_x = int((x2 - x1) * 0.04)
        pad_y = int((y2 - y1) * 0.04)

        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(width, x2 + pad_x)
        y2 = min(height, y2 + pad_y)

        if x2 <= x1 or y2 <= y1:
            continue

        crop = image[y1:y2, x1:x2]

        should_read = (
            motorcycle_boxes is None
            or plate_matches_motorcycle(
                (x1, y1, x2, y2),
                motorcycle_boxes
            )
        )

        if should_read:
            plate_number, ocr_confidence = read_plate(crop)
        else:
            plate_number, ocr_confidence = "", None

        detection_confidence = float(box.conf[0])

        if not should_read:
            status = "OCR_SKIPPED_UNMATCHED"
        elif PLATE_PATTERN.fullmatch(plate_number):

            if ocr_confidence >= OCR_MIN_CONFIDENCE:
                status = "REVIEW_REQUIRED"
            else:
                status = "LOW_CONFIDENCE"

        else:
            status = "UNREADABLE"

        plate_results.append(
            {
                "plate_number": plate_number,
                "detection_confidence": round(detection_confidence, 4),
                "ocr_confidence": (
                    round(ocr_confidence, 4)
                    if ocr_confidence is not None
                    else None
                ),
                "status": status,
                "box": [x1, y1, x2, y2],
            }
        )

    return plate_results
