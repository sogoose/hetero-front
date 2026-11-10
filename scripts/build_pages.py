#!/usr/bin/env python3
"""Stage lightweight HETERO FRONT Pages output.

The original material PNG archives remain unchanged on the GitHub main branch.
Only the generated public deployment omits them because all 60 displayed
material images use their corresponding optimized WebP.
"""
from __future__ import annotations
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"
ASSETS = ROOT / "assets"
MATERIALS = ASSETS / "materials"
ROOT_EXTENSIONS = {".html", ".css", ".js", ".json", ".ico", ".webmanifest", ".txt", ".xml"}
ROOT_SPECIAL = {".nojekyll", "CNAME", "robots.txt", "sitemap.xml"}


def should_publish(relative: Path) -> bool:
    return not (
        len(relative.parts) == 2
        and relative.parts[0] == "materials"
        and relative.suffix.lower() == ".png"
    )


def main() -> None:
    manifest = json.loads((MATERIALS / "stickers.json").read_text(encoding="utf-8"))
    if not isinstance(manifest, list) or not manifest:
        raise RuntimeError("Material manifest is missing or empty")
    for row in manifest:
        primary = row.get("image", "")
        if not primary.startswith("assets/materials/optimized/") or not primary.endswith(".webp"):
            raise RuntimeError("Non-optimized primary image: " + repr(primary))
        if not (ROOT / primary).is_file():
            raise RuntimeError("Required optimized image not found: " + primary)

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for src in ROOT.iterdir():
        if src.is_file() and (src.suffix.lower() in ROOT_EXTENSIONS or src.name in ROOT_SPECIAL):
            shutil.copy2(src, OUT / src.name)

    total_bytes = 0
    excluded_bytes = 0
    excluded_count = 0
    for src in ASSETS.rglob("*"):
        if not src.is_file():
            continue
        relative = src.relative_to(ASSETS)
        if not should_publish(relative):
            excluded_bytes += src.stat().st_size
            excluded_count += 1
            continue
        dest = OUT / "assets" / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        total_bytes += src.stat().st_size

    (OUT / ".nojekyll").touch()
    for needed in (
        "index.html", "who-are-we.html", "materials.html", "landscapes.html",
        "research.html", "interviews.html", "exhibition.html", "home.css",
        "home.js", "assets/materials/stickers.json"
    ):
        if not (OUT / needed).is_file():
            raise RuntimeError("Required published file missing: " + needed)
    print(f"Published assets: {total_bytes / 1048576:.1f} MiB")
    print(f"Source material PNGs excluded ONLY from deployment: "
          f"{excluded_count} files, {excluded_bytes / 1048576:.1f} MiB")
    print(f"Optimized sticker images verified: {len(manifest)}.")


if __name__ == "__main__":
    main()
