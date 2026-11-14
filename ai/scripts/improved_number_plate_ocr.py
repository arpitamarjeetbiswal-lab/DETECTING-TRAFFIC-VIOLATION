from pathlib import Path
import cv2
import easyocr
import re

# Project paths
BASE_DIR = Path(__file__).resolve().parents[2]

IMAGE_PATH = (
    BASE_DIR
    / "ai"
    / "test_images"
    / "number_plate.jpg"
)

# Load image
image = cv2.imread(str(IMAGE_PATH))

if image is None:
    print("Image not found!")
    raise SystemExit(1)

# Initialize OCR
print("Loading EasyOCR...")
reader = easyocr.Reader(["en"], gpu=False)

# Read text
results = reader.readtext(image)

print("\nRaw OCR Results:")

candidates = []

for bbox, text, confidence in results:

    print(f"{text} | Confidence: {confidence:.2%}")

    # Remove spaces and special characters
    cleaned = re.sub(r"[^A-Z0-9]", "", text.upper())

    # Common Indian vehicle registration pattern
    pattern = r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$"

    if re.match(pattern, cleaned) and confidence >= 0.40:
        candidates.append((cleaned, confidence))

print("\n========== FINAL RESULT ==========")

if candidates:
    plate, confidence = max(candidates, key=lambda x: x[1])

    print("Number Plate:", plate)
    print(f"Confidence: {confidence:.2%}")

else:
    print("No valid registration format detected.")