
from pathlib import Path
import xml.etree.ElementTree as ET
import re

# Dataset location
PROJECT = Path(__file__).resolve().parents[2]
DATASET = PROJECT / "ai" / "datasets" / "traffic_ocr_dataset"

xml_files = sorted(DATASET.rglob("*.xml"))

bad_labels = []
missing_objects = []
xml_errors = []

for file in xml_files:
    try:
        root = ET.parse(file).getroot()
        objects = root.findall(".//object")

        if not objects:
            missing_objects.append(file.name)

        for obj in objects:
            name = obj.findtext("name", default="")
            name = re.sub(r"[^A-Z0-9]", "", name.upper())

            if not name:
                bad_labels.append((file.name, "EMPTY"))
            elif not re.fullmatch(r"[A-Z0-9]{5,12}", name):
                bad_labels.append((file.name, name))

    except Exception as error:
        xml_errors.append((file.name, str(error)))

# Display report
print("\n========== XML DATASET REPORT ==========")
print("Total XML files:", len(xml_files))
print("Empty or unusual labels:", len(bad_labels))
print("Files without objects:", len(missing_objects))
print("XML parsing errors:", len(xml_errors))

print("\nUnusual label samples:")
for item in bad_labels[:20]:
    print(item)

print("\nMissing object samples:")
for item in missing_objects[:10]:
    print(item)

print("\nXML error samples:")
for item in xml_errors[:5]:
    print(item)

print("\n========== CHECK COMPLETED ==========")
