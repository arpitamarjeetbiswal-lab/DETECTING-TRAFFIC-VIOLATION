
from pathlib import Path
from datetime import datetime
import xml.etree.ElementTree as ET
import re
import csv

import cv2
import easyocr


# --------------------------------------------------
# PATHS AND SETTINGS
# --------------------------------------------------

PROJECT = Path(__file__).resolve().parents[2]

DATASET = PROJECT / "ai" / "datasets" / "traffic_ocr_dataset"
OUTPUT_DIR = PROJECT / "ai" / "outputs"

RUN_ID = datetime.now().strftime("%Y%m%d_%H%M%S")
CSV_PATH = OUTPUT_DIR / f"ocr_corrected_results_{RUN_ID}.csv"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

reader = easyocr.Reader(["en"], gpu=False)

ALLOWLIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


# --------------------------------------------------
# TEXT NORMALIZATION
# --------------------------------------------------

def normalize(text):
    return re.sub(r"[^A-Z0-9]", "", text.upper())


# --------------------------------------------------
# OCR READING
# --------------------------------------------------

def recognize(image):
    results = reader.readtext(
        image,
        allowlist=ALLOWLIST,
        detail=1,
        paragraph=False
    )

    if not results:
        return "", 0.0

    # Sort text regions from top to bottom,
    # then from left to right.
    results = sorted(
        results,
        key=lambda item: (
            (item[0][0][1] + item[0][2][1]) / 2,
            (item[0][0][0] + item[0][2][0]) / 2
        )
    )

    text_parts = []
    confidences = []

    for item in results:
        text_parts.append(item[1])
        confidences.append(float(item[2]))

    predicted = normalize("".join(text_parts))

    average_confidence = (
        sum(confidences) / len(confidences)
        if confidences else 0.0
    )

    return predicted, average_confidence


# --------------------------------------------------
# PREPROCESSING METHODS
# --------------------------------------------------

def preprocess_methods(crop):

    enlarged = cv2.resize(
        crop,
        None,
        fx=3,
        fy=3,
        interpolation=cv2.INTER_CUBIC
    )

    gray = cv2.cvtColor(
        enlarged,
        cv2.COLOR_BGR2GRAY
    )

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    enhanced = clahe.apply(gray)

    threshold = cv2.adaptiveThreshold(
        enhanced,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11
    )

    return {
        "Original": crop,
        "Enlarged_3x": enlarged,
        "CLAHE": enhanced,
        "Threshold": threshold
    }


# --------------------------------------------------
# CHARACTER-LEVEL ACCURACY
# --------------------------------------------------

def edit_distance(a, b):

    previous = list(range(len(b) + 1))

    for i, char_a in enumerate(a, start=1):
        current = [i]

        for j, char_b in enumerate(b, start=1):
            cost = 0 if char_a == char_b else 1

            current.append(
                min(
                    current[j - 1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + cost
                )
            )

        previous = current

    return previous[-1]


# --------------------------------------------------
# MAIN EVALUATION
# --------------------------------------------------

xml_files = sorted(DATASET.rglob("*.xml"))

rows = []
skipped = 0

for index, xml_path in enumerate(xml_files, start=1):

    try:
        root = ET.parse(xml_path).getroot()

        obj = root.find(".//object")

        if obj is None:
            skipped += 1
            continue

        box = obj.find("bndbox")

        if box is None:
            skipped += 1
            continue

        image_path = xml_path.with_suffix(".jpg")
        image = cv2.imread(str(image_path))

        if image is None:
            skipped += 1
            continue

        actual = normalize(
            obj.findtext("name", default="")
        )

        if not actual:
            skipped += 1
            continue

        x1 = int(float(box.findtext("xmin")))
        y1 = int(float(box.findtext("ymin")))
        x2 = int(float(box.findtext("xmax")))
        y2 = int(float(box.findtext("ymax")))

        height, width = image.shape[:2]

        x1 = max(0, min(x1, width))
        x2 = max(0, min(x2, width))
        y1 = max(0, min(y1, height))
        y2 = max(0, min(y2, height))

        crop = image[y1:y2, x1:x2]

        if crop.size == 0:
            skipped += 1
            continue

        methods = preprocess_methods(crop)

        for method_name, processed_image in methods.items():

            predicted, confidence = recognize(processed_image)

            distance = edit_distance(actual, predicted)

            character_accuracy = max(
                0.0,
                1.0 - distance / max(len(actual), 1)
            ) * 100

            exact_match = predicted == actual

            rows.append({
                "image": image_path.name,
                "method": method_name,
                "actual": actual,
                "predicted": predicted,
                "confidence": round(confidence, 4),
                "exact_match": exact_match,
                "edit_distance": distance,
                "character_accuracy": round(
                    character_accuracy, 2
                )
            })

        if index % 25 == 0:
            print(
                f"Processed {index}/{len(xml_files)} XML files"
            )

    except Exception as error:
        skipped += 1
        print("Skipped:", xml_path.name, "|", error)


# --------------------------------------------------
# SAVE RESULTS
# --------------------------------------------------

fieldnames = [
    "image",
    "method",
    "actual",
    "predicted",
    "confidence",
    "exact_match",
    "edit_distance",
    "character_accuracy"
]

with open(
    CSV_PATH,
    "w",
    newline="",
    encoding="utf-8"
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=fieldnames
    )

    writer.writeheader()
    writer.writerows(rows)


# --------------------------------------------------
# FINAL REPORT
# --------------------------------------------------

print("\n========== OCR EVALUATION REPORT ==========")

print("XML files found:", len(xml_files))
print("Images evaluated:", len(set(r["image"] for r in rows)))
print("Skipped files:", skipped)

print("\nMETHOD COMPARISON")

methods = [
    "Original",
    "Enlarged_3x",
    "CLAHE",
    "Threshold"
]

for method in methods:

    method_rows = [
        row for row in rows
        if row["method"] == method
    ]

    if not method_rows:
        continue

    total = len(method_rows)

    exact = sum(
        row["exact_match"] for row in method_rows
    )

    exact_accuracy = exact / total * 100

    average_character_accuracy = sum(
        row["character_accuracy"]
        for row in method_rows
    ) / total

    print("\nMethod:", method)
    print("Images:", total)
    print("Exact matches:", exact)
    print("Exact-match accuracy:", round(exact_accuracy, 2), "%")
    print(
        "Average character accuracy:",
        round(average_character_accuracy, 2),
        "%"
    )

print("\nCSV saved:", CSV_PATH)
print("========== EVALUATION COMPLETED ==========")
