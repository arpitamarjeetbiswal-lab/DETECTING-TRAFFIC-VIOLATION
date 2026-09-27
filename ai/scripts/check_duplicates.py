from pathlib import Path
from hashlib import md5
from collections import defaultdict

BASE_DIR = Path(__file__).resolve().parents[2]

DATASET_DIR = (
    BASE_DIR
    / "dataset"
    / "Traffic Violations Analysis Dataset"
)

SPLITS = {
    "train": DATASET_DIR / "Training data",
    "validation": DATASET_DIR / "validation data",
    "test": DATASET_DIR / "Test data",
}


def get_image_hash(path):
    """Return MD5 hash of image file contents."""
    h = md5()

    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)

    return h.hexdigest()


def collect_images(split_path):
    images = []

    for class_dir in split_path.iterdir():
        if not class_dir.is_dir():
            continue

        for image_path in class_dir.iterdir():
            if image_path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                images.append(image_path)

    return images


def main():
    print("=" * 60)
    print("DATASET DUPLICATE CHECK")
    print("=" * 60)

    all_hashes = defaultdict(list)

    for split_name, split_path in SPLITS.items():
        images = collect_images(split_path)

        print(f"\n{split_name.upper()}: {len(images)} images")

        for image_path in images:
            image_hash = get_image_hash(image_path)

            all_hashes[image_hash].append(
                (split_name, image_path)
            )

    duplicate_groups = [
        files
        for files in all_hashes.values()
        if len(files) > 1
    ]

    print("\n" + "=" * 60)
    print(f"TOTAL UNIQUE HASHES : {len(all_hashes)}")
    print(f"DUPLICATE GROUPS    : {len(duplicate_groups)}")
    print("=" * 60)

    cross_split_count = 0

    for group in duplicate_groups:
        splits = {item[0] for item in group}

        if len(splits) > 1:
            cross_split_count += 1

            print("\nCROSS-SPLIT DUPLICATE:")
            for split_name, path in group:
                print(f"  [{split_name}] {path}")

    print("\n" + "=" * 60)
    print(f"CROSS-SPLIT DUPLICATE GROUPS: {cross_split_count}")
    print("=" * 60)

    if cross_split_count == 0:
        print("\nNo exact duplicates found across train/validation/test.")

    print("\nNo files were deleted or modified.")


if __name__ == "__main__":
    main()