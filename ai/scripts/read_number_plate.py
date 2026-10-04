from pathlib import Path
import cv2
import easyocr


# ==========================================
# PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parents[2]

IMAGE_PATH = (
    BASE_DIR
    / "ai"
    / "outputs"
    / "violations"
    / "violation_result.jpg"
)


# ==========================================
# LOAD IMAGE
# ==========================================

image = cv2.imread(str(IMAGE_PATH))

if image is None:
    print("ERROR: Image could not be loaded.")
    print(IMAGE_PATH)
    exit()

print("Image loaded:")
print(IMAGE_PATH)


# ==========================================
# EASY OCR
# ==========================================

print("\nLoading EasyOCR...")

reader = easyocr.Reader(
    ["en"],
    gpu=False
)

print("EasyOCR loaded.")


# ==========================================
# OCR
# ==========================================

results = reader.readtext(
    image,
    detail=1
)


# ==========================================
# DISPLAY RESULTS
# ==========================================

print("\n==============================")
print("OCR RESULTS")
print("==============================")

if not results:

    print("No text detected.")

else:

    for detection in results:

        bbox, text, confidence = detection

        print(
            f"Text: {text} | "
            f"Confidence: {confidence:.2f}"
        )