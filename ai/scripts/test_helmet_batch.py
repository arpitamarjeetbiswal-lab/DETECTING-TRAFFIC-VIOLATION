from pathlib import Path
from ultralytics import YOLO


# ==========================================
# PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "ai" / "models" / "best.pt"

DATASET_DIR = (
    BASE_DIR
    / "dataset"
    / "Traffic Violations Analysis Dataset"
    / "Test data"
)

MODEL = YOLO(str(MODEL_PATH))


# ==========================================
# TEST FUNCTION
# ==========================================

def test_class(folder_name, expected_class):

    folder = DATASET_DIR / folder_name

    images = list(folder.glob("*.jpg"))[:10]

    correct = 0
    total = len(images)

    print("\n================================")
    print(f"Testing: {folder_name}")
    print("================================")

    for image_path in images:

        results = MODEL.predict(
            source=str(image_path),
            conf=0.10,
            verbose=False
        )

        result = results[0]

        if result.boxes is None or len(result.boxes) == 0:

            predicted = "NO DETECTION"

        else:

            # Take highest-confidence detection
            best_index = result.boxes.conf.argmax()

            class_id = int(
                result.boxes.cls[best_index]
            )

            predicted = MODEL.names[class_id]

        is_correct = predicted == expected_class

        if is_correct:
            correct += 1

        print(
            f"{image_path.name} "
            f"-> {predicted} "
            f"{'✓' if is_correct else '✗'}"
        )

    accuracy = (
        correct / total * 100
        if total > 0
        else 0
    )

    print(
        f"\nAccuracy: "
        f"{correct}/{total} "
        f"({accuracy:.1f}%)"
    )

    return correct, total


# ==========================================
# RUN TEST
# ==========================================

helmet_correct, helmet_total = test_class(
    "helmet",
    "With Helmet"
)

nohelmet_correct, nohelmet_total = test_class(
    "no_helmet",
    "Without Helmet"
)


# ==========================================
# FINAL SUMMARY
# ==========================================

total_correct = helmet_correct + nohelmet_correct
total_images = helmet_total + nohelmet_total

overall_accuracy = (
    total_correct / total_images * 100
    if total_images > 0
    else 0
)

print("\n================================")
print("HELMET MODEL VALIDATION")
print("================================")

print(
    f"Helmet: "
    f"{helmet_correct}/{helmet_total}"
)

print(
    f"No Helmet: "
    f"{nohelmet_correct}/{nohelmet_total}"
)

print(
    f"Overall: "
    f"{total_correct}/{total_images} "
    f"({overall_accuracy:.1f}%)"
)