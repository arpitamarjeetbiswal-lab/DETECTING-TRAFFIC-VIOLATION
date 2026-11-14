from uuid import uuid4
from datetime import datetime
from pathlib import Path
import sqlite3

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

HELMET_MODEL_PATH = BASE_DIR / "ai" / "models" / "best.pt"

helmet_model = YOLO(str(HELMET_MODEL_PATH))

# General object detector: person and motorcycle.
object_model = YOLO(str(BASE_DIR / "yolov8n.pt"))

print("HELMET MODEL CLASSES:", helmet_model.names)
print("OBJECT MODEL CLASSES:", object_model.names)


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

        return jsonify([dict(row) for row in rows])

    finally:
        conn.close()


# ==========================================
# SERVE ANNOTATED IMAGES
# ==========================================

@app.route("/api/annotated/<filename>", methods=["GET"])
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

    extension = Path(uploaded_file.filename).suffix.lower()

    if extension not in [".jpg", ".jpeg", ".png"]:
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

    original_image = cv2.imread(str(file_path))

    if original_image is None:
        file_path.unlink(missing_ok=True)

        return jsonify({
            "error": "Invalid or unreadable image"
        }), 400

    annotated_image = original_image.copy()

    timestamp = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    database_records = []

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

    print("\n========== HELMET DETECTIONS ==========")

    if helmet_results[0].boxes is not None:

        for box in helmet_results[0].boxes:

            class_id = int(box.cls.item())
            confidence = float(box.conf.item())

            class_name = helmet_model.names[class_id]

            print(
                class_name,
                round(confidence * 100, 2),
                "%"
            )

            x1, y1, x2, y2 = map(
                int,
                box.xyxy[0].tolist()
            )

            is_violation = (
                class_name == "Without Helmet"
            )

            if is_violation:

                helmet_violations += 1
                color = (0, 0, 255)

                database_records.append((
                    None,
                    "NO HELMET",
                    timestamp,
                    str(file_path),
                    "NOT_AVAILABLE"
                ))

            else:

                color = (0, 255, 0)

            cv2.rectangle(
                annotated_image,
                (x1, y1),
                (x2, y2),
                color,
                2
            )

            label = (
                f"{class_name} "
                f"{confidence * 100:.1f}%"
            )

            cv2.putText(
                annotated_image,
                label,
                (x1, max(20, y1 - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                color,
                2
            )

            detections.append({
                "violation_type": class_name,
                "confidence": round(
                    confidence * 100,
                    2
                )
            })

    print("Total helmet violations:", helmet_violations)
    print("=======================================\n")

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

        class_id = int(box.cls.item())
        confidence = float(box.conf.item())

        class_name = object_model.names[class_id]

        coordinates = tuple(
            map(int, box.xyxy[0].tolist())
        )

        item = {
            "box": coordinates,
            "confidence": confidence
        }

        if class_name == "motorcycle":
            motorcycles.append(item)

        elif class_name == "person":
            persons.append(item)

    print("Motorcycles detected:", len(motorcycles))
    print("Persons detected:", len(persons))

    # ======================================
    # 3. TRIPLE-RIDING ASSOCIATION
    # ======================================

    bike_results = []
    triple_riding_count = 0

    # A person is assigned to no more than one bike.
    assigned_persons = set()

    for bike_index, motorcycle in enumerate(
        motorcycles,
        start=1
    ):

        bx1, by1, bx2, by2 = motorcycle["box"]

        bike_width = max(1, bx2 - bx1)
        bike_height = max(1, by2 - by1)

        bike_center_x = (bx1 + bx2) / 2

        associated_persons = []
        association_debug = []

        for person_index, person in enumerate(persons):

            if person_index in assigned_persons:
                continue

            px1, py1, px2, py2 = person["box"]

            person_width = max(1, px2 - px1)
            person_height = max(1, py2 - py1)

            person_center_x = (px1 + px2) / 2
            person_bottom_y = py2

            # Horizontal overlap.
            overlap_x = max(
                0,
                min(px2, bx2) - max(px1, bx1)
            )

            overlap_ratio = overlap_x / person_width

            horizontal_match = (
                overlap_ratio >= 0.30
                and abs(person_center_x - bike_center_x)
                <= bike_width * 0.75
            )

            # Vertical alignment.
            vertical_match = (
                by1 - bike_height * 0.75
                <= person_bottom_y
                <= by2 + bike_height * 0.15
            )

            # Relative person size.
            size_match = (
                person_height >= bike_height * 0.40
            )

            is_associated = (
                horizontal_match
                and vertical_match
                and size_match
            )

            association_debug.append({
                "person_index": person_index + 1,
                "associated": is_associated,
                "horizontal_match": horizontal_match,
                "vertical_match": vertical_match,
                "size_match": size_match,
                "overlap_ratio": round(
                    overlap_ratio,
                    3
                )
            })

            if is_associated:
                associated_persons.append(person_index)

        for person_index in associated_persons:
            assigned_persons.add(person_index)

        person_count = len(associated_persons)

        # Three or more associated persons.
        is_triple_riding = person_count >= 3

        if is_triple_riding:
            triple_riding_count += 1

        status = (
            "Triple Riding Detected"
            if is_triple_riding
            else "No Triple Riding"
        )

        bike_results.append({
            "bike_index": bike_index,
            "box": motorcycle["box"],
            "person_count": person_count,
            "status": status,
            "association_debug": association_debug
        })

        print(
            f"Bike {bike_index}: "
            f"{person_count} associated persons - {status}"
        )

    # ======================================
    # 4. DRAW MOTORCYCLE BOXES
    # ======================================

    for bike in bike_results:

        bx1, by1, bx2, by2 = bike["box"]

        is_triple = (
            bike["status"] == "Triple Riding Detected"
        )

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
    # 5. DRAW PERSON BOXES
    # ======================================

    for person in persons:

        x1, y1, x2, y2 = person["box"]

        cv2.rectangle(
            annotated_image,
            (x1, y1),
            (x2, y2),
            (255, 0, 0),
            2
        )

    # ======================================
    # 6. SAVE ANNOTATED IMAGE
    # ======================================

    annotated_filename = f"{image_id}_result.jpg"

    annotated_path = OUTPUT_FOLDER / annotated_filename

    saved = cv2.imwrite(
        str(annotated_path),
        annotated_image
    )

    if not saved:
        return jsonify({
            "error": "Could not save annotated image"
        }), 500

    # ======================================
    # 7. SAVE HELMET VIOLATIONS
    # ======================================

    save_violations(database_records)

    # ======================================
    # 8. RETURN RESULTS TO REACT
    # ======================================

    total_violations = (
        helmet_violations
        + triple_riding_count
    )

    return jsonify({

        "status": "success",

        "message": "Image analyzed successfully",

        "detections": detections,

        "total_detections": len(detections),

        "helmet_violations": helmet_violations,

        "triple_riding": triple_riding_count,

        "motorcycles_detected": len(motorcycles),

        "persons_detected": len(persons),

        "bike_results": bike_results,

        "total_violations": total_violations,

        "annotated_image_url": (
            f"/api/annotated/{annotated_filename}"
        )

    })


# ==========================================
# START FLASK
# ==========================================

if __name__ == "__main__":

    print("Starting Traffic Violation Flask API...")
    print("Database:", DB_PATH)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )