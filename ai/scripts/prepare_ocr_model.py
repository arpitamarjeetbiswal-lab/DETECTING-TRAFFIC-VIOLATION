"""Download the EasyOCR recognition weights during Render's build phase."""
from pathlib import Path

import easyocr


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = PROJECT_ROOT / "ai" / "models" / "easyocr"

print(f"Preparing EasyOCR recognition weights in {MODEL_DIR}")
easyocr.Reader(
    ["en"],
    gpu=False,
    detector=False,
    model_storage_directory=str(MODEL_DIR),
)
print("EasyOCR recognition weights are ready.")
