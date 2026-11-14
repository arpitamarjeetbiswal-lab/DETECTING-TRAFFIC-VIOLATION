from pathlib import Path
import cv2
import easyocr

BASE_DIR = Path(__file__).resolve().parents[2]
IMAGE_DIR = BASE_DIR / "ai" / "test_images"

reader = easyocr.Reader(["en"], gpu=False)

for image_path in sorted(IMAGE_DIR.glob("*")):
    if image_path.suffix.lower() not in [".jpg", ".jpeg", ".png"]:
        continue

    image = cv2.imread(str(image_path))

    print("\n" + "=" * 45)
    print("IMAGE:", image_path.name)

    if image is None:
        print("Could not load image")
        continue

    results = reader.readtext(image, detail=1)

    if not results:
        print("No text detected")
    else:
        for bbox, text, confidence in results:
            print(f"Text: {text} | Confidence: {confidence:.2%}")

print("\nAll image tests completed.")
