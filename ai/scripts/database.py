import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path("ai/traffic_violations.db")


def create_database():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS violations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bike_id INTEGER,
            violation_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            image_path TEXT,
            number_plate TEXT
        )
    """)

    conn.commit()
    conn.close()


def save_violation(
    bike_id,
    violation_type,
    image_path,
    number_plate="NOT_AVAILABLE"
):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO violations
        (bike_id, violation_type, timestamp, image_path, number_plate)
        VALUES (?, ?, ?, ?, ?)
    """, (
        bike_id,
        violation_type,
        timestamp,
        image_path,
        number_plate
    ))

    conn.commit()
    violation_id = cursor.lastrowid
    conn.close()

    return violation_id


def get_violations():
    conn = sqlite3.connect(DB_PATH)
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

    return rows


if __name__ == "__main__":
    create_database()

    violation_id = save_violation(
        bike_id=1,
        violation_type="NO HELMET + TRIPLE RIDING",
        image_path="ai/outputs/violations/violation_result.jpg"
    )

    print("Database created successfully.")
    print("Test violation saved with ID:", violation_id)

    print("\nStored violations:")
    for row in get_violations():
        print(row)