
from pathlib import Path
import xml.etree.ElementTree as ET
import cv2

PROJECT = Path(__file__).resolve().parents[2]
DATASET = PROJECT / "ai" / "datasets" / "traffic_ocr_dataset"

# 30 incorrect results selected from your previous evaluation
wrong = [
    ("AN10", "AWO49412"),
    ("AN2", "WOJ3"),
    ("AN4", "AHO1MAM"),
    ("AN5", "ANO1L6155"),
    ("AN6", "EQH689"),
    ("AN7", "AN0140908"),
    ("AP1", "APO5BY7799"),
    ("AP10", "PAP39E1493"),
    ("AP12", "WL"),
    ("AP13", "WP39JJ5L41"),
    ("AP15", "AT5333"),
    ("AP16", "AP39633432"),
    ("AP17", "APE2282"),
    ("AP19", "AR04M7627"),
    ("AP2", ""),
    ("AP20", "L2044585J"),
    ("AP21", "AP31415064"),
    ("AP23", "LJRDL3557"),
    ("AP24", "AP07AD5SSS"),
    ("AP25", "EAP26AM1260"),
    ("AP29", "APIDF2888"),
    ("AP3", "APEDJOLSA"),
    ("AP30", "FAP310T9378"),
    ("AP33", "AP310ACO2O"),
    ("AP39", "APOSDY3395"),
    ("AP4", "APSNZ0031"),
    ("AP40", "AP040A4464"),
    ("AP41", "APSCG6320"),
    ("AP42", ""),
    ("AP43", "AP318G7827")
]

# 10 correct results selected from your previous evaluation
correct = [
    ("AP14", "AP10AS3445"),
    ("AP18", "AP16BS4500"),
    ("AP22", "AP16CH9545"),
    ("AP26", "AP31BR9501"),
    ("AP27", "AP31EF1155"),
    ("AP34", "AP37EJ2277"),
    ("CG1", "CG04HD6930"),
    ("CG10", "CG22H7740"),
    ("CG9", "CG04HC4887"),
    ("DL11", "DL9CAP8884")
]

selected = (
    [(name + ".jpg", prediction, "INCORRECT")
     for name, prediction in wrong]
    +
    [(name + ".jpg", prediction, "CORRECT")
     for name, prediction in correct]
)

print("Preparing 40 selected images...")
print("EasyOCR will NOT run again.")

for index, (filename, predicted, status) in enumerate(selected, start=1):

    image_path = next(DATASET.rglob(filename), None)

    if image_path is None:
        print("Image not found:", filename)
        continue

    xml_path = image_path.with_suffix(".xml")

    if not xml_path.exists():
        print("XML missing:", filename)
        continue

    root = ET.parse(xml_path).getroot()

    image = cv2.imread(str(image_path))

    if image is None:
        print("Cannot read image:", filename)
        continue

    box = root.find(".//object/bndbox")

    if box is None:
        print("Bounding box missing:", filename)
        continue

    x1 = int(box.findtext("xmin"))
    y1 = int(box.findtext("ymin"))
    x2 = int(box.findtext("xmax"))
    y2 = int(box.findtext("ymax"))

    actual = root.findtext(".//object/name", default="UNKNOWN")

    crop = image[y1:y2, x1:x2]

    if crop.size == 0:
        print("Empty crop:", filename)
        continue

    display = cv2.resize(
        crop, None, fx=4, fy=4,
        interpolation=cv2.INTER_CUBIC
    )

    cv2.putText(
        display,
        f"Actual: {actual}",
        (10, 25),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6, (0, 255, 0), 2
    )

    cv2.putText(
        display,
        f"OCR: {predicted}",
        (10, 55),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6, (0, 0, 255), 2
    )

    print("\nImage:", filename)
    print("Actual:", actual)
    print("Predicted:", predicted)
    print("Status:", status)
    print("Press N for next image or Q to quit.")

    cv2.imshow(
        f"OCR Inspection {index}/40 - {status}",
        display
    )

    key = cv2.waitKey(0) & 0xFF
    cv2.destroyAllWindows()

    if key == ord("q"):
        break

cv2.destroyAllWindows()

print("\nManual inspection completed.")
