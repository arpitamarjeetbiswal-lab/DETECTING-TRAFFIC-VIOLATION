from uuid import uuid4
from datetime import datetime
from pathlib import Path
import hashlib
import gc
import os
import sqlite3
from time import perf_counter

from plate_ocr_service import detect_and_read_plates, release_models

import cv2
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
import torch

torch.set_num_threads(1)


# ==========================================
# FLASK SETUP
# ==========================================

app = Flask(__name__)

allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

CORS(app, resources={
    r"/api/*": {
        "origins": allowed_origins
    }
})

BASE_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = Path(os.environ.get("TRAFFIC_DATA_DIR", str(BASE_DIR / "ai")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "traffic_violations.db"
UPLOAD_FOLDER = DATA_DIR / "uploads"
OUTPUT_FOLDER = DATA_DIR / "annotated"

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

app.config["MAX_CONTENT_LENGTH"] = 21 * 1024 * 1024


# Model weights are loaded only for their pipeline stage and released before
# the next model is loaded. This reduces peak resident memory on free hosts.
HELMET_MODEL_PATH = BASE_DIR / "ai" / "models" / "best.pt"
OBJECT_MODEL_PATH = BASE_DIR / "yolov8n.pt"


# ==========================================
# DATABASE HELPER
# ==========================================

def ensure_violations_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS violations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bike_id TEXT,
            violation_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            image_path TEXT,
            number_plate TEXT
        )
    """)


def save_violations(records, image_digest):

    conn = sqlite3.connect(DB_PATH)

    try:
        ensure_violations_table(conn)

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


def ensure_analysis_history_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS analysis_history (
            id TEXT PRIMARY KEY,
            file_name TEXT NOT NULL,
            result_summary TEXT NOT NULL,
            motorcycles INTEGER NOT NULL DEFAULT 0,
            persons INTEGER NOT NULL DEFAULT 0,
            confirmed_violations INTEGER NOT NULL DEFAULT 0,
            review_alerts INTEGER NOT NULL DEFAULT 0,
            confidence REAL,
            processing_time_seconds REAL,
            annotated_image_url TEXT,
            created_at TEXT NOT NULL
        )
    """)


def insert_analysis_history(conn, record):
    ensure_analysis_history_table(conn)
    conn.execute("""
        INSERT OR IGNORE INTO analysis_history (
            id, file_name, result_summary, motorcycles, persons,
            confirmed_violations, review_alerts, confidence,
            processing_time_seconds, annotated_image_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record["id"],
        record["fileName"],
        record["violations"],
        record["vehicles"],
        record["personsDetected"],
        record["violationCount"],
        record["reviewCount"],
        record["confidence"],
        record["processingTimeSeconds"],
        record["annotatedImageUrl"],
        record["createdAt"],
    ))


def serialize_analysis_history_row(row):
    created_at = datetime.fromisoformat(row["created_at"])
    return {
        "id": row["id"],
        "fileName": row["file_name"],
        "type": "Image",
        "violations": row["result_summary"],
        "vehicles": row["motorcycles"],
        "personsDetected": row["persons"],
        "violationCount": row["confirmed_violations"],
        "reviewCount": row["review_alerts"],
        "confidence": row["confidence"],
        "processingTimeSeconds": row["processing_time_seconds"],
        "annotatedImageUrl": row["annotated_image_url"],
        "date": created_at.strftime("%d %b %Y"),
        "time": created_at.strftime("%I:%M %p"),
        "createdAt": created_at.isoformat(timespec="seconds"),
        "status": "Completed",
    }


def make_history_record(record_id, file_name, result_summary, vehicles,
                        persons, confirmed, reviews, confidence,
                        processing_time, annotated_url, created_at):
    return {
        "id": record_id,
        "fileName": str(file_name or "Image")[:255],
        "type": "Image",
        "violations": str(result_summary or "No Confirmed Violations")[:160],
        "vehicles": max(0, int(vehicles or 0)),
        "personsDetected": max(0, int(persons or 0)),
        "violationCount": max(0, int(confirmed or 0)),
        "reviewCount": max(0, int(reviews or 0)),
        "confidence": confidence,
        "processingTimeSeconds": processing_time,
        "annotatedImageUrl": annotated_url,
        "createdAt": created_at,
        "date": datetime.fromisoformat(created_at).strftime("%d %b %Y"),
        "time": datetime.fromisoformat(created_at).strftime("%I:%M %p"),
        "status": "Completed",
    }


def safe_nonnegative_int(value):
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError, OverflowError):
        return 0


def safe_optional_float(value):
    try:
        number = float(value)
        return number if number == number and abs(number) != float("inf") else None
    except (TypeError, ValueError, OverflowError):
        return None


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
        "message": "Traffic Violation API is working",
        "deployment": os.environ.get("RENDER_GIT_COMMIT", "local"),
    })


# ==========================================
# GET SAVED VIOLATIONS
# ==========================================

@app.route("/api/violations", methods=["GET"])
def get_violations():

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        ensure_violations_table(conn)
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


@app.route("/api/analysis-history", methods=["GET"])
def get_analysis_history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        ensure_analysis_history_table(conn)
        rows = conn.execute(
            "SELECT * FROM analysis_history ORDER BY created_at DESC, rowid DESC"
        ).fetchall()
        return jsonify([serialize_analysis_history_row(row) for row in rows])
    finally:
        conn.close()


@app.route("/api/analysis-history/import", methods=["POST"])
def import_legacy_analysis_history():
    payload = request.get_json(silent=True) or {}
    records = payload.get("records")
    if not isinstance(records, list):
        return jsonify({"error": "Records must be provided as a list."}), 400

    conn = sqlite3.connect(DB_PATH)
    imported = 0
    try:
        ensure_analysis_history_table(conn)
        for item in records[:500]:
            if not isinstance(item, dict):
                continue

            record_id = str(item.get("id") or f"D-{uuid4().hex[:12]}")[:64]
            created_at = None
            for candidate in (item.get("createdAt"), item.get("timestamp")):
                try:
                    created_at = datetime.fromisoformat(str(candidate)).isoformat(timespec="seconds")
                    break
                except (TypeError, ValueError):
                    continue
            if created_at is None:
                try:
                    parsed = datetime.strptime(
                        f"{item.get('date', '')} {item.get('time', '')}",
                        "%d %b %Y %I:%M %p",
                    )
                    created_at = parsed.isoformat(timespec="seconds")
                except ValueError:
                    created_at = datetime.now().isoformat(timespec="seconds")

            legacy_summary = str(item.get("violations") or "")
            legacy_review_count = item.get("reviewCount")
            if legacy_review_count is None:
                # Older browser entries stored only a summary label, not a per-bike count.
                legacy_review_count = int("TRIPLE RIDING" in legacy_summary.upper())

            history_record = make_history_record(
                record_id=record_id,
                file_name=item.get("fileName"),
                result_summary=legacy_summary,
                vehicles=safe_nonnegative_int(item.get("vehicles")),
                persons=safe_nonnegative_int(item.get("personsDetected")),
                confirmed=safe_nonnegative_int(item.get("violationCount")),
                reviews=safe_nonnegative_int(legacy_review_count),
                confidence=safe_optional_float(item.get("confidence")),
                processing_time=safe_optional_float(item.get("processingTimeSeconds")),
                annotated_url=None,
                created_at=created_at,
            )
            inserted = conn.execute("SELECT 1 FROM analysis_history WHERE id = ?", (record_id,)).fetchone()
            insert_analysis_history(conn, history_record)
            if inserted is None:
                imported += 1

        conn.commit()
        return jsonify({"imported": imported})
    except (sqlite3.Error, ValueError) as error:
        conn.rollback()
        app.logger.exception("Could not import browser analysis history")
        return jsonify({"error": "Could not import previous analysis history."}), 500
    finally:
        conn.close()


@app.route("/api/violations/<int:record_id>/review", methods=["PATCH"])
def review_violation(record_id):
    action = str((request.get_json(silent=True) or {}).get("action", "")).lower()
    if action not in {"confirm", "dismiss"}:
        return jsonify({"error": "Action must be 'confirm' or 'dismiss'."}), 400

    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_violations_table(conn)
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

    if extension not in [".jpg", ".jpeg", ".png", ".webp"]:
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

    print("Analysis stage: helmet model loading")
    helmet_model = YOLO(str(HELMET_MODEL_PATH))
    helmet_class_names = helmet_model.names
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

            class_name = helmet_class_names[class_id]

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
                ),
                "box": [x1, y1, x2, y2],
            })

    print("Total helmet violations:", helmet_violations)
    print("=======================================\n")

    del helmet_results, helmet_model
    gc.collect()
    print("Analysis stage: helmet model released")

    # ======================================
    # 2. MOTORCYCLE / PERSON DETECTION
    # ======================================

    print("Analysis stage: vehicle/person model loading")
    object_model = YOLO(str(OBJECT_MODEL_PATH))
    object_class_names = object_model.names
    object_results = object_model.predict(
        source=original_image,
        # A lower threshold helps recover partially occluded riders in busy
        # scenes. Keep rider-to-bike matching conservative below to reject
        # the extra background-person detections this can introduce.
        conf=0.20,
        imgsz=640,
        classes=[0, 3],  # COCO person and motorcycle classes only.
        verbose=False
    )

    motorcycles = []
    persons = []

    for box in object_results[0].boxes:

        class_id = int(box.cls.item())
        confidence = float(box.conf.item())

        class_name = object_class_names[class_id]

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

    del object_results, object_model
    gc.collect()
    print("Analysis stage: vehicle/person model released")

    # Plate OCR is part of image analysis. Keep it isolated so a missing or
    # misconfigured OCR model does not abort helmet and rider analysis.
    plate_ocr_error = None
    try:
        print("Analysis stage: plate detection and OCR")
        plate_results = detect_and_read_plates(
            original_image,
            motorcycle_boxes=[motorcycle["box"] for motorcycle in motorcycles],
        )
    except Exception as error:
        plate_results = []
        plate_ocr_error = str(error)
        print("Plate OCR unavailable:", error)
    finally:
        release_models()
        gc.collect()

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
            "has_no_helmet": False,
            "association_debug": bike_association_debug[bike_index]
        })

        print(
            f"Bike {bike_index}: "
            f"{person_count} associated persons - {status}"
        )

    # Link each helmet violation to the person whose head region contains
    # the detection. This lets the UI identify which bike card has a helmet
    # violation instead of coloring every bike in a multi-bike image.
    bike_by_index = {
        bike["bike_index"]: bike
        for bike in bike_results
    }
    for detection in detections:
        if detection["violation_type"] != "Without Helmet":
            continue

        hx1, hy1, hx2, hy2 = detection["box"]
        helmet_center_x = (hx1 + hx2) / 2
        helmet_center_y = (hy1 + hy2) / 2
        person_candidates = []

        for person_index, person in enumerate(persons):
            px1, py1, px2, py2 = person["box"]
            person_width = max(1, px2 - px1)
            person_height = max(1, py2 - py1)
            within_head_region = (
                px1 - person_width * 0.12 <= helmet_center_x <= px2 + person_width * 0.12
                and py1 - person_height * 0.08 <= helmet_center_y <= py1 + person_height * 0.48
            )
            bike_index = person_to_bike.get(person_index)
            if within_head_region and bike_index in bike_by_index:
                horizontal_distance = abs(helmet_center_x - (px1 + px2) / 2) / person_width
                vertical_distance = abs(helmet_center_y - (py1 + py2) / 2) / person_height
                person_candidates.append((horizontal_distance + vertical_distance, bike_index))

        if person_candidates:
            _, matched_bike_index = min(person_candidates, key=lambda candidate: candidate[0])
        elif len(bike_results) == 1:
            # In a single-bike image, the only bike is the useful association
            # when the person detector misses an occluded rider.
            matched_bike_index = bike_results[0]["bike_index"]
        else:
            matched_bike_index = None

        if matched_bike_index is not None:
            detection["bike_index"] = matched_bike_index
            bike_by_index[matched_bike_index]["has_no_helmet"] = True

    # ======================================
    # 5. DRAW MOTORCYCLE BOXES
    # ======================================

    for bike in bike_results:

        bx1, by1, bx2, by2 = bike["box"]

        is_triple = (
            bike["status"] == "Triple Riding Detected"
        )
        has_no_helmet = bike["has_no_helmet"]
        is_violation = is_triple or has_no_helmet

        color = (
            (0, 0, 255)
            if is_violation
            else (0, 255, 0)
        )

        cv2.rectangle(
            annotated_image,
            (bx1, by1),
            (bx2, by2),
            color,
            3
        )

        violations = []
        if has_no_helmet:
            violations.append("NO HELMET")
        if is_triple:
            violations.append("TRIPLE RIDING")
        label = (
            f"Bike {bike['bike_index']}: "
            f"{bike['person_count']} persons - "
            f"{' + '.join(violations) if violations else 'No Violation'}"
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
    analysis_created_at = datetime.now().isoformat(timespec="seconds")
    confirmed_helmet_count = helmet_violations
    history_summary_parts = []
    if confirmed_helmet_count:
        history_summary_parts.append("No Helmet")
    if review_alerts:
        history_summary_parts.append("Possible Triple Riding · Review")
    history_summary = " + ".join(history_summary_parts) or "No Confirmed Violations"
    average_helmet_confidence = (
        round(sum(item["confidence"] for item in detections) / len(detections), 2)
        if detections else None
    )
    history_record = make_history_record(
        record_id=f"D-{uuid4().hex[:12].upper()}",
        file_name=uploaded_file.filename,
        result_summary=history_summary,
        vehicles=len(motorcycles),
        persons=len(persons),
        confirmed=confirmed_violations,
        reviews=review_alerts,
        confidence=average_helmet_confidence,
        processing_time=processing_time_seconds,
        annotated_url=f"/api/annotated/{annotated_filename}",
        created_at=analysis_created_at,
    )
    history_conn = sqlite3.connect(DB_PATH)
    try:
        insert_analysis_history(history_conn, history_record)
        history_conn.commit()
    finally:
        history_conn.close()

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

        "analysis_record": history_record,

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
        host=os.environ.get("FLASK_HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "5000")),
        debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true",
        use_reloader=False
    )
