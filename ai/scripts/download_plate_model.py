from ultralytics import YOLO
from pathlib import Path
import shutil

# Download official pretrained YOLOv8 nano model
model = YOLO("yolov8n.pt")

# Save a separate copy in our project
project_root = Path(__file__).resolve().parents[2]
destination = project_root / "ai" / "models" / "license_plate_yolov8n_pretrained.pt"

source = Path(model.ckpt_path) if hasattr(model, "ckpt_path") else Path("yolov8n.pt")

if not source.exists():
    source = Path("yolov8n.pt")

shutil.copy2(source, destination)

print("Model downloaded successfully!")
print("Saved at:", destination)
print("Size (MB):", round(destination.stat().st_size / 1024**2, 2))