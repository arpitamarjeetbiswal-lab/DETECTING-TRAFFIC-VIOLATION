import re
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np

import cv2
import easyocr

PROJECT = Path(__file__).resolve().parents[2]
DATASET = PROJECT / "ai" / "datasets" / "traffic_ocr_dataset"

reader = easyocr.Reader(["en"], gpu=False)


def normalize(text):
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def recognize(image):
    results = reader.readtext(image, allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
    if not results:
        return ""
    return normalize(max(results, key=lambda x: x[2])[1])


images = sorted(DATASET.rglob("*.jpg"))

methods = {
    "Original 4x": lambda crop: cv2.resize(
        crop, None, fx=4, fy=4,
        interpolation=cv2.INTER_CUBIC
    )
}

for image_path in images:
    root = ET.parse(image_path.with_suffix(".xml")).getroot()
    image = cv2.imread(str(image_path))

    if image is None:
        continue

    box = root.find(".//object/bndbox")
    if box is None:
        continue

    x1 = int(box.findtext("xmin"))
    y1 = int(box.findtext("ymin"))
    x2 = int(box.findtext("xmax"))
    y2 = int(box.findtext("ymax"))

    actual = normalize(root.findtext(".//object/name", default=""))
    crop = image[y1:y2, x1:x2]

    if crop.size == 0:
        continue

    print("\nImage:", image_path.name)
    print("Actual:", actual)

    for method_name, process in methods.items():
        processed = process(crop)
        predicted = recognize(processed)

        print(
            method_name + ":",
            predicted,
            "|",
            "CORRECT" if predicted == actual else "INCORRECT",
        )
