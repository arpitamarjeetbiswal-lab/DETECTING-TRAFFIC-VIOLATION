from pathlib import Path
from collections import defaultdict
import hashlib

BASE_DIR = Path(__file__).resolve().parents[2]

CLEAN_DIR = BASE_DIR / "dataset" / "Traffic Cleaned"

SPLITS = {
    "train": CLEAN_DIR / "train",
    "validation": CLEAN_DIR / "validation",
    "test": CLEAN_DIR / "test",
}

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


def get_hash(file_path):
    md5 = hashlib.md5()

    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            md5.update(chunk)

    return md5.hexdigest()


def get_images(folder):
    return [
        p
        for p in folder.rglob("*")
        if p.is_file()
        and p.suffix.lower() in IMAGE_EXTENSIONS
    ]


def main():

    print("=" * 70)
    print("CLEAN DATASET DUPLICATE CHECK")
    print("=" * 70)

    hash_groups = defaultdict(list)

    total = 0

    for split_name, split_dir in SPLITS.items():

        images = get_images(split_dir)

        print(f"\n{split_name.upper()}: {len(images)} images")

        for image in images:

            file_hash = get_hash(image)

            hash_groups[file_hash].append({
                "split": split_name,
                "path": image,
            })

            total += 1

    # Find duplicates that occur in different splits
    cross_split_groups = []

    for file_hash, items in hash_groups.items():

        splits = {
            item["split"]
            for item in items
        }

        if len(splits) > 1:
            cross_split_groups.append(items)

    # Find duplicate groups inside the same split too
    duplicate_groups = [
        items
        for items in hash_groups.values()
        if len(items) > 1
    ]

    print("\n" + "=" * 70)
    print("RESULT")
    print("=" * 70)

    print(f"\nTotal images       : {total}")
    print(f"Unique images      : {len(hash_groups)}")
    print(f"Duplicate groups   : {len(duplicate_groups)}")
    print(f"Cross-split groups : {len(cross_split_groups)}")

    if cross_split_groups:

        print("\nCROSS-SPLIT DUPLICATES FOUND:")

        for number, group in enumerate(
            cross_split_groups,
            start=1
        ):

            print(f"\nGROUP {number}")

            for item in group:

                print(
                    f"  [{item['split']}] "
                    f"{item['path']}"
                )

    else:

        print("\n✅ NO CROSS-SPLIT DUPLICATES FOUND.")

    print("\n" + "=" * 70)


if __name__ == "__main__":
    main()