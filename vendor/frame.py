#!/usr/bin/env python3
"""Frame iOS screenshots with device bezels.

Auto-detects the device model from screenshot resolution and applies
the matching Apple frame using device-frames-core.

Android screenshots are used raw (per Google Play Store guidelines).

Requirements:
    pip install device-frames-core Pillow
"""

import sys
from pathlib import Path

from device_frames_core import apply_frame, list_devices

VARIATION_PREFERENCE = ["space-black", "black", "space-grey", "silver"]
IOS_CATEGORIES = {"apple-iphone", "apple-ipad"}


def build_resolution_map():
    """Map (width, height) -> best matching iOS device info."""
    res_map = {}
    for d in list_devices():
        if d["category"] not in IOS_CATEGORIES:
            continue

        key = (d["screen"]["width"], d["screen"]["height"])
        existing = res_map.get(key)
        if existing is None:
            res_map[key] = d
        else:
            for pref in VARIATION_PREFERENCE:
                if pref in d["variation"] and pref not in existing["variation"]:
                    res_map[key] = d
                    break
    return res_map


def get_image_size(path):
    """Return (width, height) of an image."""
    from PIL import Image

    with Image.open(path) as img:
        return img.size


def frame_screenshot(input_path, output_path, res_map):
    """Frame a single screenshot, auto-detecting the device."""
    width, height = get_image_size(input_path)
    device_info = res_map.get((width, height))

    if device_info is None:
        print(f"  No matching device frame for {width}x{height}, skipping: {input_path}")
        return False

    category = device_info["category"]
    device = device_info["device"]
    variation = device_info["variation"]

    print(f"  {Path(input_path).name} -> {device} ({variation})")
    apply_frame(
        screenshot_path=Path(input_path),
        device=device,
        variation=variation,
        output_path=Path(output_path),
        category=category,
    )
    return True


def main():
    force = "--force" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--force"]

    if len(args) < 2:
        print("Usage: frame.py <raw_dir> <framed_dir> [--force]")
        sys.exit(1)

    raw_dir = Path(args[0])
    framed_dir = Path(args[1])
    framed_dir.mkdir(parents=True, exist_ok=True)

    res_map = build_resolution_map()

    screenshots = sorted(raw_dir.glob("*.png"))
    if not screenshots:
        print("No screenshots found.")
        sys.exit(1)

    skipped = 0
    to_frame = []

    for f in screenshots:
        framed_name = f"{f.stem}_framed.png"
        if not force and (framed_dir / framed_name).exists():
            skipped += 1
        else:
            to_frame.append(f)

    if not to_frame:
        print(f"All {skipped} screenshots already framed. Nothing to do.")
        return

    if skipped:
        print(f"Skipping {skipped} already framed.")
    print(f"Framing {len(to_frame)} screenshots...")

    success = 0
    for f in to_frame:
        output = framed_dir / f"{f.stem}_framed.png"
        if frame_screenshot(str(f), str(output), res_map):
            success += 1

    print(f"Done! Framed {success}/{len(to_frame)} screenshots.")


if __name__ == "__main__":
    main()
