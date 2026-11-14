from uuid import uuid4
from datetime import datetime
from pathlib import Path
import hashlib
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

app.config["MAX_CONTENT_LENGTH"] = 21 * 1024 * 1024


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

def save_violations(records, image_digest):

    conn = sqlite3.connect(DB_PATH)

    try:
        # An identical image should not create a second copy of the same
        # violation rows when someone uploads it repeatedly for testing.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS processed_image_hashes (
                image_sha256 TEXT PRIMARY KEY,
                processed_at TEXT NOT NULL
            )
        """)

        # On first use, seed hashes from historical source images still on
        # disk so re-uploading an older test image does not duplicate rows.
        existing_hashes = conn.execute(
            "SELECT COUNT(*) FROM processed_image_hashes"
        ).fetchone()[0]
        if existing_hashes == 0:
            old_paths = conn.execute(
                "SELECT DISTINCT image_path FROM violations "
                "WHERE image_path IS NOT NULL AND image_path != ''"
            ).fetchall()
            historical_hashes = []
            for (old_path,) in old_paths:
                candidate = Path(old_path)
                if not candidate.is_absolute():
                    candidate = BASE_DIR / candidate
                try:
                    if candidate.is_file():
                        historical_hashes.append((
                            hashlib.sha256(candidate.read_bytes()).hexdigest(),
                            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        ))
                except OSError:
                    # A deleted historical image cannot be fingerprinted.
                    continue
            if historical_hashes:
                conn.executemany(
                    "INSERT OR IGNORE INTO processed_image_hashes "
                    "(image_sha256, processed_at) VALUES (?, ?)",
                    historical_hashes,
                )

        inserted = conn.execute(
            """
            INSERT OR IGNORE INTO processed_image_hashes
                (image_sha256, processed_at)
            VALUES (?, ?)
            """,
            (image_digest, datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        )

        if inserted.rowcount == 0:
            conn.rollback()
            return False

        if records:
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
        return True

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

        return jsonify([dict(row) for row in rows])

    finally:
        conn.close()


@app.route("/api/violations/<int:record_id>/review", methods=["PATCH"])
def review_violation(record_id):
    action = str((request.get_json(silent=True) or {}).get("action", "")).lower()
    if action not in {"confirm", "dismiss"}:
        return jsonify({"error": "Action must be 'confirm' or 'dismiss'."}), 400

    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT violation_type FROM violations WHERE id = ?",
            (record_id,),
        ).fetchone()
        if row is None:
            return jsonify({"error": "Violation record not found."}), 404

        current_type = str(row[0] or "").strip().upper()
        if "TRIPLE RIDING" not in current_type:
            return jsonify({"error": "This record has no triple-riding review."}), 409
        if "CONFIRMED" in current_type or "DISMISSED" in current_type:
            return jsonify({"error": "This triple-riding alert was already reviewed."}), 409

        if action == "confirm":
            updated_type = (
                "NO HELMET + TRIPLE RIDING CONFIRMED"
                if "NO HELMET" in current_type
                else "TRIPLE RIDING CONFIRMED"
            )
        else:
            # Keep a separate no-helmet violation intact for combined legacy rows.
            updated_type = (
                "NO HELMET"
                if "NO HELMET" in current_type
                else "POSSIBLE TRIPLE RIDING DISMISSED"
            )

        conn.execute(
            "UPDATE violations SET violation_type = ? WHERE id = ?",
            (updated_type, record_id),
        )
        conn.commit()
        return jsonify({"id": record_id, "violation_type": updated_type})
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
    analysis_started_at = perf_counter()

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
            "error": "Only JPG, PNG, and WebP images are allowed"
        }), 400

    # --------------------------------------
    # SAVE UPLOADED IMAGE
    # --------------------------------------

    image_id = uuid4().hex
    filename = f"{image_id}{extension}"
    file_path = UPLOAD_FOLDER / filename

    uploaded_file.save(str(file_path))
    image_digest = hashlib.sha256(file_path.read_bytes()).hexdigest()

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
        # A lower threshold helps recover partially occluded riders in busy
        # scenes. Keep rider-to-bike matching conservative below to reject
        # the extra background-person detections this can introduce.
        conf=0.20,
        imgsz=768,
        classes=[0, 3],  # COCO person and motorcycle classes only.
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

    # Plate OCR is part of image analysis. Keep it isolated so a missing or
    # misconfigured OCR model does not abort helmet and rider analysis.
    plate_ocr_error = None
    try:
        plate_results = detect_and_read_plates(
            original_image,
            motorcycle_boxes=[motorcycle["box"] for motorcycle in motorcycles],
        )
    except Exception as error:
        plate_results = []
        plate_ocr_error = str(error)
        print("Plate OCR unavailable:", error)

    # ======================================
    # 3. TRIPLE-RIDING ASSOCIATION
    # ======================================

    bike_results = []
    triple_riding_count = 0
    person_to_bike = {}
    pair_metrics = {}

    # Score every plausible person-bike pair, then assign each person to at
    # most one bike. This prevents detector order from biasing crowded scenes.
    for person_index, person in enumerate(persons):
        px1, py1, px2, py2 = person["box"]
        person_width = max(1, px2 - px1)
        person_height = max(1, py2 - py1)
        person_center_x = (px1 + px2) / 2
        candidate_scores = []

        for bike_index, motorcycle in enumerate(motorcycles, start=1):
            bx1, by1, bx2, by2 = motorcycle["box"]
            bike_width = max(1, bx2 - bx1)
            bike_height = max(1, by2 - by1)

            # Expand the vehicle ROI slightly because its detector box may
            # cover the frame while clipping a pillion rider's lower body.
            roi_x1 = bx1 - bike_width * 0.20
            roi_x2 = bx2 + bike_width * 0.20
            roi_width = max(1.0, roi_x2 - roi_x1)
            bike_center_x = (roi_x1 + roi_x2) / 2
            overlap_x = max(0, min(px2, roi_x2) - max(px1, roi_x1))
            overlap_ratio = overlap_x / person_width
            center_distance = abs(person_center_x - bike_center_x) / roi_width
            bottom_offset = abs(py2 - by2) / bike_height

            horizontal_match = (
                overlap_ratio >= 0.30
                and abs(person_center_x - bike_center_x)
                <= bike_width * 0.75
            )
            vertical_match = (
                by1 - bike_height * 0.75
                <= py2
                <= by2 + bike_height * 0.15
            )
            size_match = person_height >= bike_height * 0.40
            plausible_match = (
                horizontal_match and vertical_match and size_match
            )

            score = overlap_ratio - (0.5 * center_distance) - (0.1 * bottom_offset)
            pair_metrics[(person_index, bike_index)] = {
                "horizontal_match": horizontal_match,
                "vertical_match": vertical_match,
                "size_match": size_match,
                "plausible_match": plausible_match,
                "overlap_ratio": round(overlap_ratio, 3),
            }
            if plausible_match:
                candidate_scores.append((score, bike_index))

        if candidate_scores:
            # On equal scores, prefer the lower bike index deterministically.
            best_score, best_bike_index = max(
                candidate_scores,
                key=lambda candidate: (candidate[0], -candidate[1]),
            )
            person_to_bike[person_index] = best_bike_index

    bike_association_debug = {
        bike_index: []
        for bike_index in range(1, len(motorcycles) + 1)
    }
    for (person_index, bike_index), metrics in pair_metrics.items():
        bike_association_debug[bike_index].append({
            "person_index": person_index + 1,
            "associated": person_to_bike.get(person_index) == bike_index,
            "horizontal_match": metrics["horizontal_match"],
            "vertical_match": metrics["vertical_match"],
            "size_match": metrics["size_match"],
            "overlap_ratio": metrics["overlap_ratio"],
        })

    for bike_index, motorcycle in enumerate(motorcycles, start=1):
        associated_persons = [
            person_index
            for person_index, assigned_bike in person_to_bike.items()
            if assigned_bike == bike_index
        ]

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
            "association_debug": bike_association_debug[bike_index]
        })

        print(
            f"Bike {bike_index}: "
            f"{person_count} associated persons - {status}"
        )

    # ======================================
    # 5. DRAW MOTORCYCLE BOXES
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
    # 6. DRAW PERSON BOXES
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

    records_saved = save_violations(database_records, image_digest)

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

        "total_detections": len(detections),

        "helmet_violations": helmet_violations,

        "triple_riding": triple_riding_count,

        "motorcycles_detected": len(motorcycles),

        "persons_detected": len(persons),

        "plates_detected": len(
            plate_results
        ),

        "plate_results": plate_results,

        "plate_ocr_error": plate_ocr_error,

        "bike_results": bike_results,

        "confirmed_violations": confirmed_violations,

        "review_alerts": review_alerts,

        "duplicate_image": not records_saved,

        "records_saved": len(database_records) if records_saved else 0,

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

    print("Starting Traffic Violation Flask API...")
    print("Database:", DB_PATH)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
        use_reloader=False
    )
