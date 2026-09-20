from pathlib import Path
import shutil

import torch
from torch import nn
from torchvision import datasets, transforms, models
from PIL import Image

# =========================
# Paths
# =========================

BASE_DIR = Path(__file__).resolve().parents[2]

DATASET_DIR = BASE_DIR / "dataset" / "Traffic Violations Analysis Dataset"
TEST_DIR = DATASET_DIR / "Test data"

MODEL_PATH = BASE_DIR / "ai" / "models" / "traffic_classifier.pth"

OUTPUT_DIR = BASE_DIR / "ai" / "outputs" / "wrong_predictions"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# =========================
# Device
# =========================

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("Using device:", device)


# =========================
# Transform
# =========================

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# =========================
# Dataset
# =========================

dataset = datasets.ImageFolder(
    TEST_DIR,
    transform=transform
)

print("Classes:", dataset.classes)


# =========================
# Model
# =========================

model = models.resnet18(weights=None)

model.fc = nn.Linear(
    model.fc.in_features,
    len(dataset.classes)
)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device
)

model.load_state_dict(checkpoint["model_state_dict"])

model = model.to(device)
model.eval()


# =========================
# Find wrong predictions
# =========================

wrong_count = 0

MAX_WRONG = 30

with torch.no_grad():

    for index in range(len(dataset)):

        image_tensor, true_label = dataset[index]

        image_input = image_tensor.unsqueeze(0).to(device)

        output = model(image_input)

        predicted_label = torch.argmax(output, dim=1).item()

        if predicted_label != true_label:

            original_path, _ = dataset.samples[index]

            true_class = dataset.classes[true_label]
            predicted_class = dataset.classes[predicted_label]

            source = Path(original_path)

            filename = (
                f"{wrong_count:03d}_"
                f"actual_{true_class}_"
                f"predicted_{predicted_class}_"
                f"{source.name}"
            )

            destination = OUTPUT_DIR / filename

            shutil.copy2(source, destination)

            wrong_count += 1

            print(
                f"Wrong: {source.name} | "
                f"Actual: {true_class} | "
                f"Predicted: {predicted_class}"
            )

            if wrong_count >= MAX_WRONG:
                break


print()
print("==============================")
print(f"Saved {wrong_count} wrong predictions")
print("==============================")
print("Location:")
print(OUTPUT_DIR)