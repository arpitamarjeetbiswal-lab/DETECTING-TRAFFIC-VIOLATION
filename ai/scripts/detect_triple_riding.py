from pathlib import Path
import cv2
from ultralytics import YOLO


# ==========================================
# PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parents[2]

IMAGE_PATH = (
    BASE_DIR
    / "ai"
    / "outputs"
    / "wrong_predictions"
    / "002_actual_no_helmet_predicted_overloading_test-nohelmet (10).jpg"
)

OUTPUT_DIR = BASE_DIR / "ai" / "outputs" / "triple_riding"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_IMAGE = OUTPUT_DIR / "triple_riding_result.jpg"


# ==========================================
# LOAD YOLO
# ==========================================

model = YOLO("yolov8n.pt")

print("Processing:")
print(IMAGE_PATH)


# ==========================================
# READ IMAGE
# ==========================================

image = cv2.imread(str(IMAGE_PATH))

if image is None:
    print("ERROR: Image could not be loaded.")
    exit()


# ==========================================
# YOLO DETECTION
# ==========================================

results = model.predict(
    source=str(IMAGE_PATH),
    conf=0.35,
    verbose=False
)

result = results[0]


# ==========================================
# COLLECT DETECTIONS
# ==========================================

motorcycles = []
persons = []

for box in result.boxes:

    class_id = int(box.cls[0])
    confidence = float(box.conf[0])

    x1, y1, x2, y2 = map(int, box.xyxy[0])

    class_name = model.names[class_id]

    if class_name == "motorcycle":

        motorcycles.append({
            "box": (x1, y1, x2, y2),
            "confidence": confidence
        })

    elif class_name == "person":

        persons.append({
            "box": (x1, y1, x2, y2),
            "confidence": confidence
        })


print("\n==============================")
print("YOLO DETECTION RESULTS")
print("==============================")

print(f"Motorcycles detected: {len(motorcycles)}")
print(f"Persons detected: {len(persons)}")


# ==========================================
# MOTORCYCLE-WISE PERSON ASSOCIATION
# ==========================================

bike_results = []

for bike_index, motorcycle in enumerate(motorcycles, start=1):

    bx1, by1, bx2, by2 = motorcycle["box"]

    bike_width = bx2 - bx1
    bike_height = by2 - by1

    # Wider horizontal rider zone
    rider_x1 = bx1 - int(bike_width * 0.15)
    rider_x2 = bx2 + int(bike_width * 0.15)

    # Expand vertically upward and downward
    rider_y1 = by1 - int(bike_height * 1.0)
    rider_y2 = by2 + int(bike_height * 0.30)

    associated_persons = []

    for person_index, person in enumerate(persons, start=1):

        px1, py1, px2, py2 = person["box"]

        person_center_x = (px1 + px2) // 2
        person_center_y = (py1 + py2) // 2
        person_bottom_y = py2

        # Person must be horizontally aligned
        # with the motorcycle.
        horizontal_match = (
            rider_x1 <= person_center_x <= rider_x2
        )

        # Person's body must be around the motorcycle.
        vertical_match = (
            rider_y1 <= person_bottom_y <= rider_y2
        )

        # Person's center should also be reasonably
        # close to the motorcycle.
        center_match = (
            rider_y1 <= person_center_y <= rider_y2
        )

        if horizontal_match and vertical_match and center_match:
            associated_persons.append(person_index)

    person_count = len(associated_persons)

    # ======================================
    # VIOLATION RULE
    # ======================================

    if person_count >= 3:
        status = "TRIPLE RIDING"
    else:
        status = "No triple riding"

    bike_results.append({
        "bike_index": bike_index,
        "box": (bx1, by1, bx2, by2),
        "person_count": person_count,
        "status": status
    })


    # ======================================
    # VIOLATION RULE
    # ======================================

    if person_count >= 3:
        status = "TRIPLE RIDING"
    else:
        status = "No triple riding"


    bike_results.append({
        "bike_index": bike_index,
        "box": (bx1, by1, bx2, by2),
        "person_count": person_count,
        "status": status
    })


# ==========================================
# DRAW RESULTS
# ==========================================

# Draw motorcycle boxes
for bike in bike_results:

    bx1, by1, bx2, by2 = bike["box"]

    cv2.rectangle(
        image,
        (bx1, by1),
        (bx2, by2),
        (0, 255, 0),
        3
    )

    label = (
        f"Bike {bike['bike_index']}: "
        f"{bike['person_count']} persons - "
        f"{bike['status']}"
    )

    cv2.putText(
        image,
        label,
        (bx1, max(30, by1 - 10)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (0, 255, 0),
        2
    )


# Draw person boxes
for person in persons:

    x1, y1, x2, y2 = person["box"]

    cv2.rectangle(
        image,
        (x1, y1),
        (x2, y2),
        (255, 0, 0),
        2
    )


# ==========================================
# SAVE IMAGE
# ==========================================

cv2.imwrite(
    str(OUTPUT_IMAGE),
    image
)


# ==========================================
# PRINT FINAL RESULT
# ==========================================

print("\n==============================")
print("TRIPLE RIDING ANALYSIS")
print("==============================")

for bike in bike_results:

    print(
        f"Bike {bike['bike_index']} -> "
        f"{bike['person_count']} associated persons -> "
        f"{bike['status']}"
    )


print("\nResult saved to:")
print(OUTPUT_IMAGE)