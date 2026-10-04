from flask import Flask, jsonify
import sqlite3
from pathlib import Path

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parents[2]
DB_PATH = BASE_DIR / "ai" / "traffic_violations.db"


@app.route("/")
def home():
    return jsonify({
        "status": "running",
        "message": "Traffic Violation API is working"
    })


@app.route("/api/violations", methods=["GET"])
def get_violations():

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            bike_id,
            violation_type,
            timestamp,
            image_path,
            number_plate
        FROM violations
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()

    conn.close()

    violations = [dict(row) for row in rows]

    return jsonify(violations)


if __name__ == "__main__":
    print("Starting Traffic Violation Flask API...")
    print("Database:", DB_PATH)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )