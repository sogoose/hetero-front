#!/usr/bin/env python3
"""Trim transparent margins from the material PNG originals and regenerate WebP.

Only transparent pixels outside the actual cutout are removed. Existing
material images/labels are kept; metadata records the tight final dimensions.
Running this script twice is safe: a small transparent bleed is kept for alpha
edge quality, and the second pass will not trim the same image again.
"""
from pathlib import Path
import json
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "assets/materials"
MANIFEST = FOLDER / "stickers.json"
TARGET = FOLDER / "optimized"
REPORT = FOLDER / "trim-report.json"
TARGET.mkdir(parents=True, exist_ok=True)

MAX_SIDE = 1600
WEBP_QUALITY = 81
ALPHA_QUALITY = 92
ALPHA_THRESHOLD = 7
EDGE_PADDING = 6
WEBP_SAVINGS_MIN = 0.15

items = json.loads(MANIFEST.read_text(encoding="utf-8"))
report = []
total_source_before = 0
total_source_after = 0
total_display = 0
trimmed_count = 0
webp_count = 0

for item in items:
    name = item.get("original") or item.get("image")
    if not name:
        continue
    source = ROOT / name
    if not source.is_file():
        print(f"MISSING {name}")
        continue

    before_size = source.stat().st_size
    total_source_before += before_size

    try:
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original).convert("RGBA")
            before_width, before_height = image.size
            alpha = image.getchannel("A")
            mask = alpha.point(lambda x: 255 if x >= ALPHA_THRESHOLD else 0)
            bbox = mask.getbbox()

            # A non-transparent image has no removable alpha margin.
            # Keep a six-pixel safe transparent bleed so antialiasing never clips.
            has_alpha = alpha.getextrema()[0] < 255
            if has_alpha and bbox:
                left = max(0, bbox[0] - EDGE_PADDING)
                top = max(0, bbox[1] - EDGE_PADDING)
                right = min(image.width, bbox[2] + EDGE_PADDING)
                bottom = min(image.height, bbox[3] + EDGE_PADDING)
                cropped = (left, top, right, bottom)
            else:
                cropped = (0, 0, image.width, image.height)

            trimmed = cropped != (0, 0, image.width, image.height)
            if trimmed:
                image = image.crop(cropped)
                # The user approved modifying originals: preserve the PNG
                # format and transparency, replacing only excess alpha space.
                image.save(source, "PNG", optimize=True, compress_level=6)
                trimmed_count += 1

            source_size = source.stat().st_size
            total_source_after += source_size
            source_width, source_height = image.size

            display = image.copy()
            if max(display.size) > MAX_SIDE:
                display.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
            display_width, display_height = display.size

            output = TARGET / ("sticker-" + item["id"] + ".webp")
            display.save(
                output, "WEBP", quality=WEBP_QUALITY,
                alpha_quality=ALPHA_QUALITY, method=5, exact=True
            )
            result_size = output.stat().st_size
            if result_size < source_size * (1 - WEBP_SAVINGS_MIN):
                item["image"] = output.relative_to(ROOT).as_posix()
                total_display += result_size
                webp_count += 1
            else:
                item["image"] = name
                total_display += source_size
                output.unlink()

            # The layout uses actual cutout dimensions rather than a
            # guessed category ratio. This fixes floating labels and gaps.
            item["imageWidth"] = (
                display_width if item["image"].endswith(".webp")
                else source_width
            )
            item["imageHeight"] = (
                display_height if item["image"].endswith(".webp")
                else source_height
            )
            item["assetRevision"] = "trim1"

            record = {
                "id": item["id"],
                "file": name,
                "before": [before_width, before_height],
                "after": [source_width, source_height],
                "display": [item["imageWidth"], item["imageHeight"]],
                "trimmed": trimmed,
                "trimRect": list(cropped),
                "beforeBytes": before_size,
                "afterBytes": source_size,
                "displayBytes": result_size if item["image"].endswith(".webp") else source_size,
                "image": item["image"],
            }
            report.append(record)
            print(
                f"{item['id']}: {before_width}x{before_height} -> "
                f"{source_width}x{source_height}; {item['image']} "
                f"({record['displayBytes']//1024} KB)"
            )
    except (UnidentifiedImageError, OSError, ValueError) as error:
        print(f"SKIPPED {name}: {error}")
        total_source_after += before_size
        total_display += before_size

MANIFEST.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
REPORT.write_text(json.dumps({
    "count": len(report),
    "trimmedCount": trimmed_count,
    "webpCount": webp_count,
    "originalBeforeBytes": total_source_before,
    "originalAfterBytes": total_source_after,
    "displayBytes": total_display,
    "items": report,
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print(
    f"DONE: {trimmed_count} PNG originals trimmed; {webp_count} display WebPs; "
    f"originals {total_source_before/1048576:.1f} -> "
    f"{total_source_after/1048576:.1f} MB; "
    f"display assets {total_display/1048576:.1f} MB"
)
