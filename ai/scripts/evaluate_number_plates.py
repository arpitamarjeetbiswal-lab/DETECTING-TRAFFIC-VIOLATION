import re
import xml.etree.ElementTree as ET
from pathlib import Path

import cv2
import easyocr
from ultralytics import YOLO

# Project paths
PROJECT = Path(__file__).resolve().parents[2]
DATASET = PROJECT / "ai" / "datasets" / "traffic_ocr_dataset"
MODEL_PATH = PROJECT / "ai" / "models" / "license_plate_detector.pt"

# Load models
print("Loading YOLO model...")
model = YOLO(str(MODEL_PATH))

print("Loading EasyOCR...")
reader = easyocr.Reader(["en"], gpu=False)

def normalize(text):
    return re.sub(r"[^A-Z0-9]", "", text.upper())

def get_actual_plate(xml_file):
    root = ET.parse(xml_file).getroot()
    return root.findtext(".//object/name", default="").strip()

def recognize_plate(image_path):
    image = cv2.imread(str(image_path))

    if image is None:
        return ""

    results = model.predict(
        source=image,
        conf=0.80,
        verbose=False
    )

    predictions = []

    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            crop = image[y1:y2, x1:x2]

            if crop.size == 0:
                continue

            ocr_results = reader.readtext(crop)

            for detection in ocr_results:
                text = normalize(detection[1])

                if text:
                    predictions.append(
                        (text, float(detection[2]))
                    )

    if not predictions:
        return ""

    return max(predictions, key=lambda x: x[1])[0]

# Test first 5 images
images = sorted(DATASET.rglob("*.jpg"))[:5]

correct = 0
total = 0

print("\nStarting 5-image OCR evaluation...\n")

for image_path in images:
    xml_file = image_path.with_suffix(".xml")

    actual = normalize(get_actual_plate(xml_file))
    predicted = recognize_plate(image_path)

    total += 1

    if actual == predicted:
        correct += 1
        status = "CORRECT"
    else:
        status = "INCORRECT"

    print("Image:", image_path.name)
    print("Actual:   ", actual)
    print("Predicted:", predicted)
    print("Result:   ", status)
    print("-" * 40)

print("\nEvaluation completed.")
print("Correct:", correct, "/", total)

if total:
    print("Accuracy:", round(correct / total * 100, 2), "%")