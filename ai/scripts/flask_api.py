from uuid import uuid4
from datetime import datetime
from pathlib import Path
import sqlite3
from time import perf_counter

from plate_ocr_service import detect_and_read_plates

import cv2
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO


# ==========================================
# FLASK SETUP
# ==========================================

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ]
    }
})

BASE_DIR = Path(__file__).resolve().parents[2]

DB_PATH = BASE_DIR / "ai" / "traffic_violations.db"

UPLOAD_FOLDER = BASE_DIR / "ai" / "uploads"

OUTPUT_FOLDER = BASE_DIR / "ai" / "outputs" / "annotated"

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

app.config["MAX_CONTENT_LENGTH"] = 101 * 1024 * 1024


# ==========================================
# LOAD AI MODELS
# ==========================================

HELMET_MODEL_PATH = (
    BASE_DIR / "ai" / "models" / "best.pt"
)

helmet_model = YOLO(str(HELMET_MODEL_PATH))

# Detects motorcycles and people.
OBJECT_MODEL_PATH = BASE_DIR / "yolov8n.pt"
object_model = YOLO(str(OBJECT_MODEL_PATH))


# ==========================================
# DATABASE HELPER
# ==========================================

def save_violations(records):

    if not records:
        return

    conn = sqlite3.connect(DB_PATH)

    try:
        conn.executemany("""
            INSERT INTO violations
            (
                bike_id,
                violation_type,
                timestamp,
                image_path,
                number_plate
            )
            VALUES (?, ?, ?, ?, ?)
        """, records)

        conn.commit()

    finally:
        conn.close()


def intersection_over_inner_area(inner_box, outer_box):

    ix1, iy1, ix2, iy2 = inner_box
    ox1, oy1, ox2, oy2 = outer_box

    intersection_width = max(
        0,
        min(ix2, ox2) - max(ix1, ox1)
    )
    intersection_height = max(
        0,
        min(iy2, oy2) - max(iy1, oy1)
    )

    inner_area = max(1, ix2 - ix1) * max(1, iy2 - iy1)

    return (
        intersection_width * intersection_height
    ) / inner_area


def match_box_to_motorcycle(box, motorcycles, minimum_overlap=0.5):

    matches = []

    for motorcycle_index, motorcycle in enumerate(motorcycles, start=1):

        overlap = intersection_over_inner_area(
            box,
            motorcycle["box"]
        )

        if overlap >= minimum_overlap:
            matches.append((overlap, motorcycle_index))

    matches.sort(reverse=True)

    if not matches:
        return None

    # Leave overlapping, near-equal matches unassigned.
    if (
        len(matches) > 1
        and matches[0][0] - matches[1][0] < 0.10
    ):
        return None

    return matches[0][1]


def match_head_to_motorcycle(head_box, persons, person_to_bike):

    matches = []

    for person_index, motorcycle_index in person_to_bike.items():

        overlap = intersection_over_inner_area(
            head_box,
            persons[person_index]["box"]
        )

        if overlap >= 0.5:
            matches.append((overlap, motorcycle_index))

    matches.sort(reverse=True)

    if not matches:
        return None

    if (
        len(matches) > 1
        and matches[0][1] != matches[1][1]
        and matches[0][0] - matches[1][0] < 0.10
    ):
        return None

    return matches[0][1]


# ==========================================
# HOME API
# ==========================================

@app.route("/")
def home():

    return jsonify({
        "status": "running",
        "message": "Traffic Violation API is working"
    })


# ==========================================
# GET SAVED VIOLATIONS
# ==========================================

@app.route("/api/violations", methods=["GET"])
def get_violations():

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        rows = conn.execute("""
            SELECT
                id,
                bike_id,
                violation_type,
                timestamp,
                image_path,
                number_plate
            FROM violations
            ORDER BY id DESC
        """).fetchall()

        return jsonify([
            dict(row) for row in rows
        ])

    finally:
        conn.close()


# ==========================================
# SERVE ANNOTATED IMAGES
# ==========================================

@app.route(
    "/api/annotated/<filename>",
    methods=["GET"]
)
def get_annotated_image(filename):

    return send_from_directory(
        str(OUTPUT_FOLDER),
        filename
    )


# ==========================================
# ANALYZE UPLOADED IMAGE
# ==========================================

@app.route("/api/analyze", methods=["POST"])
def analyze_image():

    # --------------------------------------
    # CHECK UPLOADED FILE
    # --------------------------------------

    if "file" not in request.files:

        return jsonify({
            "error": "No file uploaded"
        }), 400

    uploaded_file = request.files["file"]

    if not uploaded_file.filename:

        return jsonify({
            "error": "No file selected"
        }), 400

    extension = Path(
        uploaded_file.filename
    ).suffix.lower()

    if extension not in [
        ".jpg",
        ".jpeg",
        ".png"
    ]:

        return jsonify({
            "error": "Only JPG and PNG images are allowed"
        }), 400

    # --------------------------------------
    # SAVE UPLOADED IMAGE
    # --------------------------------------

    image_id = uuid4().hex

    filename = f"{image_id}{extension}"

    file_path = UPLOAD_FOLDER / filename

    uploaded_file.save(str(file_path))

    # Read the original image.
    original_image = cv2.imread(
        str(file_path)
    )

    if original_image is None:

        file_path.unlink(missing_ok=True)

        return jsonify({
            "error": "Invalid or unreadable image"
        }), 400

    analysis_started_at = perf_counter()

    # Work on a copy for drawing.
    annotated_image = original_image.copy()

    timestamp = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    database_records = []
    helmet_violation_candidates = []

    # ======================================
    # 1. HELMET DETECTION
    # ======================================

    helmet_results = helmet_model.predict(
        source=original_image,
        conf=0.25,
        verbose=False
    )

    detections = []

    helmet_violations = 0

    for box in helmet_results[0].boxes:

        class_id = int(
            box.cls.item()
        )

        confidence = float(
            box.conf.item()
        )

        class_name = helmet_model.names[
            class_id
        ]

        x1, y1, x2, y2 = map(
            int,
            box.xyxy[0].tolist()
        )

        is_violation = (
            class_name == "Without Helmet"
        )

        if is_violation:
            helmet_violation_candidates.append({
                "box": (x1, y1, x2, y2),
                "detection_index": len(detections)
            })

        detections.append({
            "violation_type": class_name,
            "confidence": round(
                confidence * 100,
                2
            ),
            "box": [x1, y1, x2, y2],
            "violation_confirmed": None if not is_violation else False
        })

    # ======================================
    # 2. MOTORCYCLE / PERSON DETECTION
    # ======================================

    object_results = object_model.predict(
        source=original_image,
        conf=0.35,
        verbose=False
    )

    motorcycles = []
    persons = []

    for box in object_results[0].boxes:

        class_id = int(
            box.cls.item()
        )

        confidence = float(
            box.conf.item()
        )

        class_name = object_model.names[
            class_id
        ]

        coordinates = tuple(
            map(
                int,
                box.xyxy[0].tolist()
            )
        )

        item = {
            "box": coordinates,
            "confidence": confidence
        }

        if class_name == "motorcycle":

            motorcycles.append(item)

        elif class_name == "person":

            persons.append(item)

    # ======================================
    # 3. NUMBER-PLATE DETECTION AND OCR
    # ======================================

    plate_results = detect_and_read_plates(
        original_image,
        motorcycle_boxes=[
            motorcycle["box"]
            for motorcycle in motorcycles
        ]
    )

    # ======================================
    # 4. TRIPLE-RIDING DETECTION
    # ======================================

    bike_results = []
    triple_riding_count = 0
    person_to_bike = {}

    # Prevent one person being associated with multiple bikes.
    assigned_persons = set()

    for bike_index, motorcycle in enumerate(motorcycles, start=1):

        bx1, by1, bx2, by2 = motorcycle["box"]

        bike_width = max(1, bx2 - bx1)
        bike_height = max(1, by2 - by1)
        bike_center_x = (bx1 + bx2) / 2

        associated_persons = []

        for person_index, person in enumerate(persons):

            if person_index in assigned_persons:
                continue

            px1, py1, px2, py2 = person["box"]

            person_width = max(1, px2 - px1)
            person_height = max(1, py2 - py1)

            person_center_x = (px1 + px2) / 2
            person_bottom_y = py2

            # How much of the person's horizontal box
            # overlaps with the motorcycle?
            overlap_x = max(
                0,
                min(px2, bx2) - max(px1, bx1)
            )

            overlap_ratio = overlap_x / person_width

            # Person should be horizontally aligned
            # with the motorcycle, not merely nearby.
            horizontal_match = (
                overlap_ratio >= 0.45
                and abs(person_center_x - bike_center_x)
                <= bike_width * 0.60
            )

            # The lower part of the person should be
            # around the upper/middle motorcycle region.
            vertical_match = (
                by1 - bike_height * 0.65
                <= person_bottom_y
                <= by2 + bike_height * 0.05
            )

            # Reject people whose boxes are unusually
            # small relative to the motorcycle.
            size_match = (
                person_height >= bike_height * 0.55
            )

            if (
                horizontal_match
                and vertical_match
                and size_match
            ):
                associated_persons.append(person_index)

        for person_index in associated_persons:
            assigned_persons.add(person_index)
            person_to_bike[person_index] = bike_index

        person_count = len(associated_persons)

        # Geometric matching alone cannot confirm
        # a traffic violation. Flag possible cases
        # for human review instead.
        needs_review = person_count >= 3

        if needs_review:
            triple_riding_count += 1

        status = (
            "Needs Review"
            if needs_review
            else "No triple riding confirmed"
        )

        bike_results.append({
            "bike_index": bike_index,
            "box": motorcycle["box"],
            "person_count": person_count,
            "status": status
        })

    # Link a plate to a motorcycle only when most of the plate box
    # falls within that motorcycle's detected box.
    for plate in plate_results:

        motorcycle_index = match_box_to_motorcycle(
            plate["box"],
            motorcycles
        )

        plate["motorcycle_index"] = motorcycle_index
        plate["association_status"] = (
            "MATCHED"
            if motorcycle_index is not None
            else "UNMATCHED"
        )

    # Store possible triple-riding cases for review, not as confirmed guilt.
    for bike in bike_results:

        if bike["status"] != "Needs Review":
            continue

        bike_plates = [
            plate
            for plate in plate_results
            if (
                plate["motorcycle_index"] == bike["bike_index"]
                and plate["status"] == "REVIEW_REQUIRED"
                and plate["plate_number"]
            )
        ]

        database_records.append((
            bike["bike_index"],
            "POSSIBLE TRIPLE RIDING",
            timestamp,
            str(file_path),
            bike_plates[0]["plate_number"]
            if len(bike_plates) == 1
            else "NOT_AVAILABLE"
        ))

    # Associate each no-helmet head detection with its rider and then
    # with that motorcycle's sole readable plate, when unambiguous.
    for candidate in helmet_violation_candidates:

        motorcycle_index = match_head_to_motorcycle(
            candidate["box"],
            persons,
            person_to_bike
        )

        readable_plates = [
            plate
            for plate in plate_results
            if (
                plate["motorcycle_index"] == motorcycle_index
                and plate["status"] == "REVIEW_REQUIRED"
                and plate["plate_number"]
            )
        ]

        associated_plate = (
            readable_plates[0]
            if motorcycle_index is not None
            and len(readable_plates) == 1
            else None
        )

        violation_confirmed = motorcycle_index is not None

        detections[candidate["detection_index"]].update({
            "motorcycle_index": motorcycle_index,
            "violation_confirmed": violation_confirmed,
            "number_plate": (
                associated_plate["plate_number"]
                if associated_plate
                else None
            ),
            "plate_association_status": (
                "MATCHED"
                if associated_plate
                else "UNAVAILABLE"
            )
        })

        if violation_confirmed:
            helmet_violations += 1
            database_records.append((
                motorcycle_index,
                "NO HELMET",
                timestamp,
                str(file_path),
                (
                    associated_plate["plate_number"]
                    if associated_plate
                    else "NOT_AVAILABLE"
                )
            ))

    # Draw helmet detections after rider-to-bike association so that
    # unassociated alerts are visibly marked for review, not as confirmed.
    for detection in detections:

        x1, y1, x2, y2 = detection["box"]
        is_no_helmet = detection["violation_type"] == "Without Helmet"

        if is_no_helmet and detection["violation_confirmed"]:
            color = (0, 0, 255)
            label = "NO HELMET"
        elif is_no_helmet:
            color = (0, 165, 255)
            label = "REVIEW: BIKE NOT MATCHED"
        else:
            color = (0, 255, 0)
            label = detection["violation_type"]

        cv2.rectangle(
            annotated_image,
            (x1, y1),
            (x2, y2),
            color,
            2
        )
        cv2.putText(
            annotated_image,
            f"{label} {detection['confidence']:.1f}%",
            (x1, max(20, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            color,
            2
        )

    # ======================================
    # 5. DRAW MOTORCYCLE BOXES
    # ======================================

    for bike in bike_results:

        bx1, by1, bx2, by2 = bike["box"]

        is_triple = (
            bike["status"] == "Needs Review"
        )

        # Red for triple riding.
        # Green for other detected motorcycles.
        color = (
            (0, 0, 255)
            if is_triple
            else (0, 255, 0)
        )

        cv2.rectangle(
            annotated_image,
            (bx1, by1),
            (bx2, by2),
            color,
            3
        )

        label = (
            f"Bike {bike['bike_index']}: "
            f"{bike['person_count']} persons - "
            f"{bike['status']}"
        )

        cv2.putText(
            annotated_image,
            label,
            (bx1, max(30, by1 - 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2
        )

    # ======================================
    # 6. DRAW PERSON BOXES
    # ======================================

    for person in persons:

        x1, y1, x2, y2 = person["box"]

        # Blue in OpenCV BGR format.
        cv2.rectangle(
            annotated_image,
            (x1, y1),
            (x2, y2),
            (255, 0, 0),
            2
        )

    # ======================================
    # 7. DRAW NUMBER-PLATE BOXES
    # ======================================

    for plate in plate_results:

        x1, y1, x2, y2 = plate["box"]
        plate_number = plate["plate_number"]
        plate_status = plate["status"]

        color = (
            (0, 165, 255)
            if plate_status == "REVIEW_REQUIRED"
            else (0, 0, 255)
        )

        cv2.rectangle(
            annotated_image,
            (x1, y1),
            (x2, y2),
            color,
            2
        )

        label = (
            plate_number
            if plate_number
            else plate_status.replace("_", " ")
        )

        cv2.putText(
            annotated_image,
            label,
            (x1, max(20, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2
        )

    # ======================================
    # 8. SAVE ANNOTATED IMAGE
    # ======================================

    annotated_filename = (
        f"{image_id}_result.jpg"
    )

    annotated_path = (
        OUTPUT_FOLDER / annotated_filename
    )

    saved = cv2.imwrite(
        str(annotated_path),
        annotated_image
    )

    if not saved:

        return jsonify({
            "error": "Could not save annotated image"
        }), 500

    # ======================================
    # 9. SAVE VIOLATIONS IN SQLITE
    # ======================================

    save_violations(
        database_records
    )

    # ======================================
    # 10. RETURN RESULTS TO REACT
    # ======================================

    confirmed_violations = helmet_violations
    review_alerts = triple_riding_count
    processing_time_seconds = round(
        perf_counter() - analysis_started_at,
        2
    )

    print(
        f"Image analysis completed in {processing_time_seconds:.2f}s"
    )

    return jsonify({

        "status": "success",

        "message": "Image analyzed successfully",

        "detections": detections,

        "total_detections": len(
            detections
        ),

        "helmet_violations": helmet_violations,

        "triple_riding": triple_riding_count,

        "motorcycles_detected": len(
            motorcycles
        ),

        "persons_detected": len(
            persons
        ),

        "plates_detected": len(
            plate_results
        ),

        "plate_results": plate_results,

        "bike_results": bike_results,

        "confirmed_violations": confirmed_violations,

        "review_alerts": review_alerts,

        # Keep the legacy field, now limited to confirmed violations.
        "total_violations": confirmed_violations,

        "processing_time_seconds": processing_time_seconds,

        "annotated_image_url": (
            f"/api/annotated/{annotated_filename}"
        )

    })


# ==========================================
# START FLASK
# ==========================================

if __name__ == "__main__":

    print(
        "Starting Traffic Violation Flask API..."
    )

    print(
        "Database:",
        DB_PATH
    )

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
        use_reloader=False
    )
