
import xml.etree.ElementTree as ET
from pathlib import Path
import cv2

PROJECT = Path(__file__).resolve().parents[2]
DATASET = PROJECT / "ai" / "datasets" / "traffic_ocr_dataset"

images = sorted(DATASET.rglob("*.jpg"))[:5]

for image_path in images:
    image = cv2.imread(str(image_path))
    root = ET.parse(image_path.with_suffix(".xml")).getroot()

    box = root.find(".//object/bndbox")

    if image is None or box is None:
        continue

    x1 = int(box.findtext("xmin"))
    y1 = int(box.findtext("ymin"))
    x2 = int(box.findtext("xmax"))
    y2 = int(box.findtext("ymax"))

    crop = image[y1:y2, x1:x2]

    print("\nImage:", image_path.name)
    print("Original image:", image.shape[1], "x", image.shape[0])
    print("Plate crop:", crop.shape[1], "x", crop.shape[0])
