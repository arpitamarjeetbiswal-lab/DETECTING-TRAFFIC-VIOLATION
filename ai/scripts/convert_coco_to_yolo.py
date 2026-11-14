
import json
import shutil
from pathlib import Path

# Original dataset
SOURCE = Path(r"C:\Users\akrou\Desktop\Number Plate Dataset")

# Output dataset inside the project
PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT = PROJECT_ROOT / "ai" / "datasets" / "number_plate_yolo"

SPLITS = {
    "train": "train",
    "valid": "val",
    "test": "test",
}

# COCO category 1 is the only category actually used.
CATEGORY_ID = 1


def convert_split(source_split, output_split):
    source_dir = SOURCE / source_split
    json_path = source_dir / "_annotations.coco.json"

    with json_path.open("r", encoding="utf-8") as file:
        coco = json.load(file)

    image_map = {
        image["id"]: image
        for image in coco["images"]
    }

    image_output = OUTPUT / "images" / output_split
    label_output = OUTPUT / "labels" / output_split

    image_output.mkdir(parents=True, exist_ok=True)
    label_output.mkdir(parents=True, exist_ok=True)

    labels_by_image = {
        image_id: []
        for image_id in image_map
    }

    converted = 0
    skipped = 0

    for annotation in coco["annotations"]:
        if annotation["category_id"] != CATEGORY_ID:
            continue

        image_id = annotation["image_id"]

        if image_id not in image_map:
            skipped += 1
            continue

        image = image_map[image_id]
        width = image["width"]
        height = image["height"]

        x, y, box_width, box_height = annotation["bbox"]

        if width <= 0 or height <= 0:
            skipped += 1
            continue

        if box_width <= 0 or box_height <= 0:
            skipped += 1
            continue

        # COCO: top-left x, top-left y, width, height
        # YOLO: center_x, center_y, width, height
        center_x = (x + box_width / 2) / width
        center_y = (y + box_height / 2) / height
        normalized_width = box_width / width
        normalized_height = box_height / height

        # Check normalized coordinates
        if not (
            0 <= center_x <= 1
            and 0 <= center_y <= 1
            and 0 < normalized_width <= 1
            and 0 < normalized_height <= 1
        ):
            skipped += 1
            continue

        line = (
            f"0 {center_x:.6f} {center_y:.6f} "
            f"{normalized_width:.6f} {normalized_height:.6f}"
        )

        labels_by_image[image_id].append(line)
        converted += 1

    copied = 0

    for image_id, image in image_map.items():
        filename = image["file_name"]
        source_image = source_dir / filename

        if not source_image.is_file():
            skipped += 1
            continue

        destination_image = image_output / filename
        shutil.copy2(source_image, destination_image)

        label_name = Path(filename).with_suffix(".txt").name
        label_file = label_output / label_name

        label_file.write_text(
            "\n".join(labels_by_image[image_id]),
            encoding="utf-8"
        )

        copied += 1

    print(
        f"{source_split}: images copied={copied}, "
        f"annotations converted={converted}, skipped={skipped}"
    )


def main():
    if OUTPUT.exists():
        raise FileExistsError(
            f"Output already exists: {OUTPUT}\n"
            "Rename or inspect it before running again."
        )

    for source_split, output_split in SPLITS.items():
        convert_split(source_split, output_split)

    yaml_content = """path: .
train: images/train
val: images/val
test: images/test

nc: 1
names:
  0: Number-Plate
"""

    (OUTPUT / "data.yaml").write_text(
        yaml_content,
        encoding="utf-8"
    )

    print("\nConversion completed!")
    print("Output:", OUTPUT)


if __name__ == "__main__":
    main()
