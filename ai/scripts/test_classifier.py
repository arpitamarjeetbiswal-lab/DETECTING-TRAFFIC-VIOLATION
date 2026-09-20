from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

# =========================
# 1. Paths
# =========================

BASE_DIR = Path(__file__).resolve().parents[2]

DATASET_DIR = BASE_DIR / "dataset" / "Traffic Violations Analysis Dataset"
TEST_DIR = DATASET_DIR / "Test data"

MODEL_PATH = BASE_DIR / "ai" / "models" / "traffic_classifier.pth"


# =========================
# 2. Device
# =========================

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("Using device:", device)


# =========================
# 3. Test image transforms
# =========================

test_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# =========================
# 4. Load test dataset
# =========================

test_dataset = datasets.ImageFolder(
    TEST_DIR,
    transform=test_transform
)

test_loader = DataLoader(
    test_dataset,
    batch_size=16,
    shuffle=False,
    num_workers=0
)

print("Classes:", test_dataset.classes)
print("Test images:", len(test_dataset))


# =========================
# 5. Recreate model
# =========================

model = models.resnet18(weights=None)

model.fc = nn.Linear(
    model.fc.in_features,
    len(test_dataset.classes)
)


# =========================
# 6. Load trained weights
# =========================

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device
)

model.load_state_dict(checkpoint["model_state_dict"])

model = model.to(device)
model.eval()


# =========================
# 7. Test model
# =========================

correct = 0
total = 0

class_correct = [0] * len(test_dataset.classes)
class_total = [0] * len(test_dataset.classes)

with torch.no_grad():

    for images, labels in test_loader:

        images = images.to(device)
        labels = labels.to(device)

        outputs = model(images)

        _, predicted = torch.max(outputs, 1)

        total += labels.size(0)
        correct += (predicted == labels).sum().item()

        for label, prediction in zip(labels, predicted):

            label = label.item()
            prediction = prediction.item()

            class_total[label] += 1

            if label == prediction:
                class_correct[label] += 1


# =========================
# 8. Results
# =========================

accuracy = 100 * correct / total

print()
print("==============================")
print("TEST RESULTS")
print("==============================")

print(f"Correct predictions: {correct}/{total}")
print(f"Test Accuracy: {accuracy:.2f}%")

print()
print("Class-wise Accuracy:")

for i, class_name in enumerate(test_dataset.classes):

    if class_total[i] > 0:
        class_accuracy = (
            100 * class_correct[i] / class_total[i]
        )

        print(
            f"{class_name}: "
            f"{class_correct[i]}/{class_total[i]} "
            f"({class_accuracy:.2f}%)"
        )

print()
print("Testing completed!")