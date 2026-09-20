from pathlib import Path
from ultralytics import YOLO


# ==========================================
# PROJECT PATH
# ==========================================

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "ai" / "models" / "best.pt"

IMAGE_PATH = (
    BASE_DIR
    / "dataset"
    / "Traffic Violations Analysis Dataset"
    / "Test data"
    / "no_helmet"
    / "test-nohelmet (2).jpg"
)

OUTPUT_DIR = BASE_DIR / "ai" / "outputs" / "helmet_test"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ==========================================
# LOAD MODEL
# ==========================================

print("Loading helmet model...")

model = YOLO(str(MODEL_PATH))


# ==========================================
# RUN DETECTION
# ==========================================

print("Processing:")
print(IMAGE_PATH)

results = model.predict(
    source=str(IMAGE_PATH),
    conf=0.25,
    save=True,
    project=str(OUTPUT_DIR),
    name="result",
    exist_ok=True,
    verbose=False
)


# ==========================================
# SHOW RESULTS
# ==========================================

print("\n==============================")
print("HELMET DETECTION")
print("==============================")

for result in results:

    if result.boxes is None:
        print("No helmet detections found.")
        continue

    for box in result.boxes:

        class_id = int(box.cls[0])
        confidence = float(box.conf[0])

        class_name = model.names[class_id]

        print(
            f"{class_name} "
            f"(confidence: {confidence:.2f})"
        )


print("\nResult saved to:")
print(OUTPUT_DIR / "result")
