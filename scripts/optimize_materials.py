#!/usr/bin/env python3
"""Create size-limited transparent WebP display copies of archival materials.
The original PNGs remain unchanged; only generated display files and the manifest are updated.
"""
from pathlib import Path
import json
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"assets/materials/stickers.json"
TARGET=ROOT/"assets/materials/optimized"
TARGET.mkdir(parents=True,exist_ok=True)
items=json.loads(MANIFEST.read_text(encoding="utf-8"))
total_before=0
total_after=0
processed=0
kept=0
MAX_SIDE=1600
MIN_ORIGINAL=600_000

for item in items:
    source_name=item.get("original") or item.get("image")
    if not source_name:
        continue
    source=ROOT/source_name
    if not source.exists():
        print(f"Missing: {source_name}")
        continue
    size=source.stat().st_size
    total_before+=size
    if source.suffix.lower()!=".png" or size<MIN_ORIGINAL:
        item["image"]=source_name
        total_after+=size
        kept+=1
        continue
    output=TARGET/("sticker-"+item["id"]+".webp")
    try:
        with Image.open(source) as original:
            # Preserve transparent pixels and the untouched original PNG.
            img=ImageOps.exif_transpose(original).convert("RGBA")
            if max(img.size)>MAX_SIDE:
                img.thumbnail((MAX_SIDE,MAX_SIDE),Image.Resampling.LANCZOS)
            img.save(output,"WEBP",quality=81,alpha_quality=92,method=5,exact=True)
    except (UnidentifiedImageError,OSError,ValueError) as e:
        print(f"Skipped {source.name}: {e}")
        item["image"]=source_name
        total_after+=size
        continue
    reduced=output.stat().st_size
    if reduced < size*0.85:
        item["image"]=output.relative_to(ROOT).as_posix()
        total_after+=reduced
        processed+=1
        print(f"{source.name}: {size//1024} KB -> {reduced//1024} KB")
    else:
        output.unlink()
        item["image"]=source_name
        total_after+=size
        kept+=1
        print(f"Keep original {source.name}; compression not worthwhile")

MANIFEST.write_text(json.dumps(items,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"Result: {processed} optimized, {kept} kept; {total_before/1048576:.1f} MB -> {total_after/1048576:.1f} MB display assets")
