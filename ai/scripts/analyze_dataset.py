from pathlib import Path
from collections import defaultdict
import hashlib

# ============================================================
# CONFIG
# ============================================================

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

OUTPUT_DIR = BASE_DIR / "ai" / "outputs"
REPORT_FILE = OUTPUT_DIR / "dataset_analysis.txt"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


# ============================================================
# HELPERS
# ============================================================

def get_hash(file_path):
    """Return MD5 hash of an image file."""
    md5 = hashlib.md5()

    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            md5.update(chunk)

    return md5.hexdigest()


def get_images(folder):
    """Return all image files recursively."""
    if not folder.exists():
        return []

    return [
        p for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    ]


# ============================================================
# MAIN ANALYSIS
# ============================================================

def main():

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("TRAFFIC DATASET ANALYSIS")
    print("=" * 70)

    # hash -> list of image records
    hash_groups = defaultdict(list)

    # Statistics
    split_counts = defaultdict(int)
    class_counts = defaultdict(lambda: defaultdict(int))

    # --------------------------------------------------------
    # Scan dataset
    # --------------------------------------------------------

    for split_name, split_dir in SPLITS.items():

        images = get_images(split_dir)

        print(f"\n{split_name.upper()}: {len(images)} images")

        for image_path in images:

            # Class = parent directory name
            class_name = image_path.parent.name

            file_hash = get_hash(image_path)

            split_counts[split_name] += 1
            class_counts[split_name][class_name] += 1

            hash_groups[file_hash].append({
                "split": split_name,
                "class": class_name,
                "path": image_path
            })

    # --------------------------------------------------------
    # Find duplicate groups
    # --------------------------------------------------------

    duplicate_groups = {
        h: items
        for h, items in hash_groups.items()
        if len(items) > 1
    }

    cross_split_groups = {}
    conflicting_groups = {}

    for h, items in duplicate_groups.items():

        splits = {item["split"] for item in items}
        classes = {item["class"] for item in items}

        # Same image appears in different splits
        if len(splits) > 1:
            cross_split_groups[h] = items

        # Same image appears with different labels
        if len(classes) > 1:
            conflicting_groups[h] = items

    # --------------------------------------------------------
    # Print summary
    # --------------------------------------------------------

    total_images = sum(split_counts.values())
    unique_hashes = len(hash_groups)

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    for split_name in SPLITS:
        print(f"{split_name.capitalize():12}: {split_counts[split_name]}")

    print("-" * 70)

    print(f"Total images        : {total_images}")
    print(f"Unique images       : {unique_hashes}")
    print(f"Duplicate groups    : {len(duplicate_groups)}")
    print(f"Cross-split groups  : {len(cross_split_groups)}")
    print(f"Conflicting labels  : {len(conflicting_groups)}")

    # --------------------------------------------------------
    # Class distribution
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("CLASS DISTRIBUTION")
    print("=" * 70)

    for split_name in SPLITS:

        print(f"\n{split_name.upper()}")

        for class_name, count in sorted(
            class_counts[split_name].items()
        ):
            print(f"  {class_name:15} : {count}")

    # --------------------------------------------------------
    # Write report
    # --------------------------------------------------------

    with open(REPORT_FILE, "w", encoding="utf-8") as report:

        report.write("=" * 70 + "\n")
        report.write("TRAFFIC DATASET ANALYSIS REPORT\n")
        report.write("=" * 70 + "\n\n")

        report.write("SUMMARY\n")
        report.write("-" * 70 + "\n")

        for split_name in SPLITS:
            report.write(
                f"{split_name.capitalize():12}: "
                f"{split_counts[split_name]}\n"
            )

        report.write("\n")
        report.write(f"Total images        : {total_images}\n")
        report.write(f"Unique images       : {unique_hashes}\n")
        report.write(
            f"Duplicate groups    : {len(duplicate_groups)}\n"
        )
        report.write(
            f"Cross-split groups  : {len(cross_split_groups)}\n"
        )
        report.write(
            f"Conflicting labels  : {len(conflicting_groups)}\n"
        )

        # ----------------------------------------------------
        # Class distribution
        # ----------------------------------------------------

        report.write("\n\n")
        report.write("=" * 70 + "\n")
        report.write("CLASS DISTRIBUTION\n")
        report.write("=" * 70 + "\n")

        for split_name in SPLITS:

            report.write(f"\n{split_name.upper()}\n")

            for class_name, count in sorted(
                class_counts[split_name].items()
            ):
                report.write(
                    f"  {class_name:15} : {count}\n"
                )

        # ----------------------------------------------------
        # Cross-split duplicates
        # ----------------------------------------------------

        report.write("\n\n")
        report.write("=" * 70 + "\n")
        report.write("CROSS-SPLIT DUPLICATES\n")
        report.write("=" * 70 + "\n")

        for index, (file_hash, items) in enumerate(
            cross_split_groups.items(),
            start=1
        ):

            report.write(
                f"\nGROUP {index}\n"
            )

            for item in items:

                report.write(
                    f"  [{item['split']}] "
                    f"[{item['class']}] "
                    f"{item['path']}\n"
                )

        # ----------------------------------------------------
        # Conflicting labels
        # ----------------------------------------------------

        report.write("\n\n")
        report.write("=" * 70 + "\n")
        report.write("CONFLICTING LABELS\n")
        report.write("=" * 70 + "\n")

        for index, (file_hash, items) in enumerate(
            conflicting_groups.items(),
            start=1
        ):

            report.write(
                f"\nGROUP {index}\n"
            )

            for item in items:

                report.write(
                    f"  [{item['split']}] "
                    f"[{item['class']}] "
                    f"{item['path']}\n"
                )

        report.write("\n\n")
        report.write("=" * 70 + "\n")
        report.write("IMPORTANT\n")
        report.write("=" * 70 + "\n")
        report.write(
            "This script only analyzes the dataset.\n"
        )
        report.write(
            "No files were deleted, moved, renamed, or modified.\n"
        )

    print("\n" + "=" * 70)
    print("REPORT SAVED")
    print("=" * 70)
    print(REPORT_FILE)


if __name__ == "__main__":
    main()