from pathlib import Path
from collections import defaultdict
import hashlib
import shutil

# ============================================================
# CONFIG
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

SOURCE_DIR = (
    BASE_DIR
    / "dataset"
    / "Traffic Violations Analysis Dataset"
)

OUTPUT_DIR = (
    BASE_DIR
    / "dataset"
    / "Traffic Cleaned"
)

SPLITS = {
    "train": SOURCE_DIR / "Training data",
    "validation": SOURCE_DIR / "validation data",
    "test": SOURCE_DIR / "Test data",
}

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


# ============================================================
# HELPERS
# ============================================================

def get_hash(file_path):
    """Calculate MD5 hash of an image."""
    md5 = hashlib.md5()

    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            md5.update(chunk)

    return md5.hexdigest()


def get_images(folder):
    """Find all supported images recursively."""
    if not folder.exists():
        return []

    return [
        p
        for p in folder.rglob("*")
        if p.is_file()
        and p.suffix.lower() in IMAGE_EXTENSIONS
    ]


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("CREATING CLEAN TRAFFIC DATASET")
    print("=" * 70)

    print("\nOriginal dataset:")
    print(SOURCE_DIR)

    print("\nClean dataset:")
    print(OUTPUT_DIR)

    # --------------------------------------------------------
    # Safety check
    # --------------------------------------------------------

    if OUTPUT_DIR.exists():
        print("\nERROR:")
        print("Traffic Cleaned already exists.")
        print("Delete it manually only if you intentionally want to")
        print("recreate the cleaned dataset.")
        return

    # --------------------------------------------------------
    # Collect every image
    # --------------------------------------------------------

    hash_groups = defaultdict(list)

    total_images = 0

    for split_name, split_dir in SPLITS.items():

        images = get_images(split_dir)

        print(f"\nScanning {split_name}: {len(images)} images")

        for image_path in images:

            image_hash = get_hash(image_path)

            record = {
                "split": split_name,
                "class": image_path.parent.name,
                "path": image_path,
            }

            hash_groups[image_hash].append(record)

            total_images += 1

    print("\nTotal images scanned:", total_images)

    # --------------------------------------------------------
    # Classify hash groups
    # --------------------------------------------------------

    clean_groups = []
    conflict_groups = []

    for image_hash, items in hash_groups.items():

        classes = {item["class"] for item in items}
        splits = {item["split"] for item in items}

        # Same image has different labels
        if len(classes) > 1:
            conflict_groups.append(items)

        else:
            clean_groups.append(items)

    print("Unique image groups:", len(hash_groups))
    print("Conflict groups:", len(conflict_groups))

    # --------------------------------------------------------
    # Create output directories
    # --------------------------------------------------------

    for split_name in SPLITS:

        for class_name in [
            "helmet",
            "no_helmet",
            "overloading",
        ]:
            (
                OUTPUT_DIR
                / split_name
                / class_name
            ).mkdir(
                parents=True,
                exist_ok=True
            )

    conflict_dir = OUTPUT_DIR / "review_conflicts"

    conflict_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    # --------------------------------------------------------
    # Assign unique images to splits
    #
    # Priority:
    # test > validation > train
    #
    # If an exact image exists in multiple splits,
    # keep only ONE copy.
    # --------------------------------------------------------

    priority = {
        "test": 3,
        "validation": 2,
        "train": 1,
    }

    copied = 0
    conflicts_copied = 0

    report_lines = []

    report_lines.append(
        "CLEAN DATASET CREATION REPORT"
    )

    report_lines.append(
        "=" * 70
    )

    report_lines.append(
        f"Original images: {total_images}"
    )

    report_lines.append(
        f"Unique image groups: {len(hash_groups)}"
    )

    report_lines.append(
        f"Conflicting label groups: {len(conflict_groups)}"
    )

    # --------------------------------------------------------
    # Handle conflicts first
    # --------------------------------------------------------

    for group_number, items in enumerate(
        conflict_groups,
        start=1
    ):

        group_dir = (
            conflict_dir
            / f"group_{group_number:03d}"
        )

        group_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        report_lines.append("")
        report_lines.append(
            f"CONFLICT GROUP {group_number}"
        )

        for item in items:

            original = item["path"]

            destination_name = (
                f"{item['split']}__"
                f"{item['class']}__"
                f"{original.name}"
            )

            destination = (
                group_dir
                / destination_name
            )

            shutil.copy2(
                original,
                destination
            )

            conflicts_copied += 1

            report_lines.append(
                f"  [{item['split']}] "
                f"[{item['class']}] "
                f"{original}"
            )

    # --------------------------------------------------------
    # Handle non-conflicting images
    # --------------------------------------------------------

    for group in clean_groups:

        # Pick highest-priority split
        selected = max(
            group,
            key=lambda item: priority[item["split"]]
        )

        split_name = selected["split"]
        class_name = selected["class"]
        original = selected["path"]

        destination_dir = (
            OUTPUT_DIR
            / split_name
            / class_name
        )

        destination = (
            destination_dir
            / original.name
        )

        # Avoid filename collision
        if destination.exists():

            counter = 1

            while True:

                destination = (
                    destination_dir
                    / f"{original.stem}_"
                    f"{counter}"
                    f"{original.suffix}"
                )

                if not destination.exists():
                    break

                counter += 1

        shutil.copy2(
            original,
            destination
        )

        copied += 1

    # --------------------------------------------------------
    # Save report
    # --------------------------------------------------------

    report_lines.append("")
    report_lines.append(
        "=" * 70
    )

    report_lines.append(
        f"Clean images copied: {copied}"
    )

    report_lines.append(
        f"Conflict copies for review: {conflicts_copied}"
    )

    report_lines.append("")
    report_lines.append(
        "Original dataset was NOT modified."
    )

    report_file = (
        OUTPUT_DIR
        / "cleaning_report.txt"
    )

    with open(
        report_file,
        "w",
        encoding="utf-8"
    ) as f:

        f.write(
            "\n".join(report_lines)
        )

    # --------------------------------------------------------
    # Final output
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("CLEANING COMPLETE")
    print("=" * 70)

    print("\nClean images copied:", copied)

    print(
        "Conflict images copied for review:",
        conflicts_copied
    )

    print("\nCreated:")
    print(OUTPUT_DIR)

    print("\nReport:")
    print(report_file)

    print("\nOriginal dataset was NOT modified.")


if __name__ == "__main__":
    main()