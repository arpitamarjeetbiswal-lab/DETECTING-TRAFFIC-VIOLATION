
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import Counter

PROJECT = Path(__file__).resolve().parents[2]
DATASET = PROJECT / "ai" / "datasets" / "traffic_ocr_dataset"

state_counts = Counter()
total_images = 0
valid_labels = 0

for image in DATASET.rglob("*.jpg"):
    total_images += 1

    xml_file = image.with_suffix(".xml")

    if not xml_file.exists():
        continue

    root = ET.parse(xml_file).getroot()
    plate = root.findtext(".//object/name", default="").strip()

    if plate:
        valid_labels += 1
        state_counts[image.parent.name] += 1

print("Total images:", total_images)
print("Valid plate labels:", valid_labels)

print("\nImages by folder/state:")
for state, count in sorted(state_counts.items()):
    print(state, ":", count)
