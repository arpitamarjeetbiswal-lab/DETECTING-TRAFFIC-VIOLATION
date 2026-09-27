from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

from sklearn.metrics import (
    confusion_matrix,
    classification_report,
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

TEST_DIR = (
    BASE_DIR
    / "dataset"
    / "Traffic Cleaned"
    / "test"
)

MODEL_PATH = (
    BASE_DIR
    / "ai"
    / "models"
    / "traffic_classifier_clean.pth"
)


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Using device:", device)


# ============================================================
# TRANSFORM
# ============================================================

test_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])


# ============================================================
# TEST DATASET
# ============================================================

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

print("\nClasses:", test_dataset.classes)
print("Test images:", len(test_dataset))


# ============================================================
# LOAD MODEL
# ============================================================

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device
)

classes = checkpoint["classes"]

print(
    "Best validation accuracy from saved model:",
    f"{checkpoint['val_accuracy']:.2f}%"
)

model = models.resnet18(weights=None)

model.fc = nn.Linear(
    model.fc.in_features,
    len(classes)
)

model.load_state_dict(
    checkpoint["model_state_dict"]
)

model = model.to(device)
model.eval()


# ============================================================
# PREDICTIONS
# ============================================================

all_predictions = []
all_labels = []

with torch.no_grad():

    for images, labels in test_loader:

        images = images.to(device)

        outputs = model(images)

        _, predictions = torch.max(
            outputs,
            1
        )

        all_predictions.extend(
            predictions.cpu().numpy()
        )

        all_labels.extend(
            labels.numpy()
        )


# ============================================================
# OVERALL ACCURACY
# ============================================================

correct = sum(
    prediction == label
    for prediction, label
    in zip(all_predictions, all_labels)
)

total = len(all_labels)

accuracy = (
    100.0 * correct / total
)


print("\n" + "=" * 60)
print("CLEAN TEST RESULTS")
print("=" * 60)

print(
    f"\nCorrect predictions: "
    f"{correct}/{total}"
)

print(
    f"Test Accuracy: "
    f"{accuracy:.2f}%"
)


# ============================================================
# PER-CLASS ACCURACY
# ============================================================

print("\nPER-CLASS ACCURACY")
print("-" * 60)

for index, class_name in enumerate(classes):

    class_indices = [
        i
        for i, label in enumerate(all_labels)
        if label == index
    ]

    class_correct = sum(
        all_predictions[i] == index
        for i in class_indices
    )

    class_total = len(class_indices)

    class_accuracy = (
        100.0 * class_correct / class_total
        if class_total > 0
        else 0
    )

    print(
        f"{class_name}: "
        f"{class_correct}/{class_total} "
        f"({class_accuracy:.2f}%)"
    )


# ============================================================
# CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(
    all_labels,
    all_predictions
)

print("\nCONFUSION MATRIX")
print("-" * 60)

print("Rows = Actual")
print("Columns = Predicted\n")

print("Classes:", classes)
print(cm)


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

print("\nCLASSIFICATION REPORT")
print("-" * 60)

print(
    classification_report(
        all_labels,
        all_predictions,
        target_names=classes,
        digits=4
    )
)


# ============================================================
# FINISHED
# ============================================================

print("=" * 60)
print("TESTING COMPLETE")
print("=" * 60)