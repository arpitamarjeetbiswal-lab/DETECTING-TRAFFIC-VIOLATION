import xml.etree.ElementTree as ET
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]
DATASET = PROJECT / "ai" / "datasets" / "traffic_ocr_dataset"

total = 0
valid = 0
missing = 0

for xml_file in DATASET.rglob("*.xml"):
    total += 1

    try:
        root = ET.parse(xml_file).getroot()
        plate = root.findtext(".//object/name")

        if plate and plate.strip():
            valid += 1
        else:
            missing += 1

    except ET.ParseError:
        missing += 1

print("Total XML files:", total)
print("Valid plate labels:", valid)
print("Missing or invalid labels:", missing)