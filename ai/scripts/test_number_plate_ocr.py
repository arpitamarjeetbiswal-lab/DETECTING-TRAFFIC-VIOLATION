from pathlib import Path
import cv2
import easyocr

# Project image path
BASE_DIR = Path(__file__).resolve().parents[2]
IMAGE_PATH = BASE_DIR / "ai" / "test_images" / "number_plate.jpg"

# Load image
image = cv2.imread(str(IMAGE_PATH))

if image is None:
    print("ERROR: Could not load image.")
    raise SystemExit(1)

print("Image loaded successfully!")

# Initialize EasyOCR using CPU
print("Loading EasyOCR...")
reader = easyocr.Reader(["en"], gpu=False)

# Read text
print("Reading number plate...")
results = reader.readtext(image)

# Display results
print("\n========== OCR RESULTS ==========")

if not results:
    print("No text detected.")
else:
    for bbox, text, confidence in results:
        print(f"Detected text: {text}")
        print(f"Confidence: {confidence:.2%}")
        print("--------------------------------")

print("OCR test completed.")
