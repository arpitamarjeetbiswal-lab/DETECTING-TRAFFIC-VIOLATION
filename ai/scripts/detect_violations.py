from pathlib import Path
import cv2
from ultralytics import YOLO
import sys


# ==========================================
# DATABASE IMPORT
# ==========================================

sys.path.append(str(Path(__file__).resolve().parent))

from database import create_database, save_violation


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

OUTPUT_DIR = BASE_DIR / "ai" / "outputs" / "violations"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_IMAGE = OUTPUT_DIR / "violation_result.jpg"


# ==========================================
# DATABASE
# ==========================================

create_database()


# ==========================================
# MODELS
# ==========================================

print("Loading YOLO models...")

object_model = YOLO("yolov8n.pt")

helmet_model = YOLO(
    str(BASE_DIR / "ai" / "models" / "best.pt")
)

print("Models loaded.")


# ==========================================
# READ IMAGE
# ==========================================

image = cv2.imread(str(IMAGE_PATH))

if image is None:

    print("ERROR: Image could not be loaded.")
    print(IMAGE_PATH)

    sys.exit(1)


print("\nProcessing:")
print(IMAGE_PATH)


# ==========================================
# OBJECT DETECTION
# ==========================================

results = object_model.predict(
    source=str(IMAGE_PATH),
    conf=0.35,
    verbose=False
)

result = results[0]

motorcycles = []
persons = []


for box in result.boxes:

    class_id = int(box.cls[0])
    confidence = float(box.conf[0])

    x1, y1, x2, y2 = map(
        int,
        box.xyxy[0]
    )

    class_name = object_model.names[class_id]

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
print("OBJECT DETECTION")
print("==============================")

print(f"Motorcycles: {len(motorcycles)}")
print(f"Persons: {len(persons)}")


# ==========================================
# HELMET DETECTION
# ==========================================

helmet_results = helmet_model.predict(
    source=str(IMAGE_PATH),
    conf=0.10,
    verbose=False
)

helmet_result = helmet_results[0]

helmet_detections = []


for box in helmet_result.boxes:

    class_id = int(box.cls[0])
    confidence = float(box.conf[0])

    x1, y1, x2, y2 = map(
        int,
        box.xyxy[0]
    )

    class_name = helmet_model.names[class_id]

    helmet_detections.append({
        "box": (x1, y1, x2, y2),
        "class": class_name,
        "confidence": confidence
    })


print("\n==============================")
print("HELMET DETECTION")
print("==============================")


for detection in helmet_detections:

    print(
        f"{detection['class']} "
        f"confidence={detection['confidence']:.2f}"
    )


# ==========================================
# FUNCTION:
# ASSOCIATE HELMET WITH PERSON
# ==========================================

def get_person_helmet_status(person_box):

    px1, py1, px2, py2 = person_box

    person_width = px2 - px1
    person_height = py2 - py1

    # Focus mainly on upper part of person
    head_x1 = px1 - int(
        person_width * 0.20
    )

    head_x2 = px2 + int(
        person_width * 0.20
    )

    head_y1 = py1

    head_y2 = py1 + int(
        person_height * 0.40
    )

    matches = []


    for helmet in helmet_detections:

        hx1, hy1, hx2, hy2 = helmet["box"]

        helmet_center_x = (
            hx1 + hx2
        ) // 2

        helmet_center_y = (
            hy1 + hy2
        ) // 2


        if (
            head_x1 <= helmet_center_x <= head_x2
            and
            head_y1 <= helmet_center_y <= head_y2
        ):

            matches.append(helmet)


    if not matches:

        return "UNKNOWN"


    # Select strongest helmet detection
    best = max(
        matches,
        key=lambda x: x["confidence"]
    )

    class_name = best["class"].lower()


    if (
        "without" in class_name
        or
        "no" in class_name
    ):

        return "NO HELMET"


    if (
        "with" in class_name
        or
        "helmet" in class_name
    ):

        return "HELMET"


    return "UNKNOWN"


# ==========================================
# MOTORCYCLE-WISE ANALYSIS
# ==========================================

bike_results = []


for bike_index, motorcycle in enumerate(
    motorcycles,
    start=1
):

    bx1, by1, bx2, by2 = motorcycle["box"]

    bike_width = bx2 - bx1
    bike_height = by2 - by1


    # Same rider zone logic
    rider_x1 = (
        bx1 -
        int(bike_width * 0.15)
    )

    rider_x2 = (
        bx2 +
        int(bike_width * 0.15)
    )

    rider_y1 = (
        by1 -
        int(bike_height * 1.0)
    )

    rider_y2 = (
        by2 +
        int(bike_height * 0.30)
    )


    associated_persons = []


    # ======================================
    # ASSOCIATE PERSONS WITH BIKE
    # ======================================

    for person in persons:

        px1, py1, px2, py2 = person["box"]

        person_center_x = (
            px1 + px2
        ) // 2

        person_center_y = (
            py1 + py2
        ) // 2

        person_bottom_y = py2


        horizontal_match = (
            rider_x1
            <= person_center_x
            <= rider_x2
        )

        vertical_match = (
            rider_y1
            <= person_bottom_y
            <= rider_y2
        )

        center_match = (
            rider_y1
            <= person_center_y
            <= rider_y2
        )


        if (
            horizontal_match
            and
            vertical_match
            and
            center_match
        ):

            associated_persons.append(
                person
            )


    person_count = len(
        associated_persons
    )


    # ======================================
    # HELMET STATUS
    # ======================================

    helmet_statuses = []


    for person in associated_persons:

        status = get_person_helmet_status(
            person["box"]
        )

        helmet_statuses.append(
            status
        )


    no_helmet_found = (
        "NO HELMET"
        in helmet_statuses
    )


    # ======================================
    # FINAL VIOLATION
    # ======================================

    violations = []


    if no_helmet_found:

        violations.append(
            "NO HELMET"
        )


    if person_count >= 3:

        violations.append(
            "TRIPLE RIDING"
        )


    if violations:

        final_status = " + ".join(
            violations
        )

    else:

        final_status = "NO VIOLATION"


    # ======================================
    # STORE BIKE RESULT
    # ======================================

    bike_results.append({

        "bike_index": bike_index,

        "box": (
            bx1,
            by1,
            bx2,
            by2
        ),

        "person_count": person_count,

        "helmet_statuses":
            helmet_statuses,

        "status":
            final_status
    })


# ==========================================
# DRAW BIKE RESULTS
# ==========================================

for bike in bike_results:

    bx1, by1, bx2, by2 = bike["box"]


    # Bike bounding box
    cv2.rectangle(

        image,

        (bx1, by1),

        (bx2, by2),

        (0, 255, 0),

        3
    )


    label = (
        f"Bike {bike['bike_index']}: "
        f"{bike['status']}"
    )


    cv2.putText(

        image,

        label,

        (
            bx1,
            max(30, by1 - 10)
        ),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.55,

        (0, 255, 0),

        2
    )


# ==========================================
# DRAW PERSON BOXES
# ==========================================

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
# SAVE RESULT IMAGE
# ==========================================

cv2.imwrite(

    str(OUTPUT_IMAGE),

    image
)


# ==========================================
# FINAL REPORT
# ==========================================

print("\n==============================")
print("FINAL VIOLATION ANALYSIS")
print("==============================")


for bike in bike_results:

    print(

        f"Bike {bike['bike_index']} -> "

        f"{bike['person_count']} persons -> "

        f"Helmet: "
        f"{bike['helmet_statuses']} -> "

        f"VIOLATION: "
        f"{bike['status']}"
    )


    # ======================================
    # SAVE ACTUAL VIOLATION TO DATABASE
    # ======================================

    if bike["status"] != "NO VIOLATION":

        violation_id = save_violation(

            bike_id=bike["bike_index"],

            violation_type=bike["status"],

            image_path=str(
                OUTPUT_IMAGE
            ),

            number_plate="NOT_AVAILABLE"
        )


        print(
            f"Database record saved: "
            f"ID {violation_id}"
        )


# ==========================================
# FINAL OUTPUT
# ==========================================

print("\nResult saved to:")

print(OUTPUT_IMAGE)

print("\nDatabase updated successfully.")