#!/usr/bin/env python3
"""Build a 1200x630 JPEG for link previews from the actual landing scene."""
from __future__ import annotations

import io
import shutil
import subprocess
import tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"
TARGET = OUT / "assets" / "share" / "home-og-v1.jpg"
SIZE = (1200, 630)

def browser_capture() -> Image.Image:
    browser = next((found for name in ("google-chrome","google-chrome-stable","chromium")
                    if (found := shutil.which(name))),None)
    if not browser:
        raise RuntimeError("No headless Chrome on builder")
    with tempfile.TemporaryDirectory(prefix="hetero-og-") as directory:
        shot = Path(directory) / "page.png"
        cmd = [browser,"--headless=new","--no-sandbox","--disable-gpu",
               "--disable-dev-shm-usage","--hide-scrollbars",
               "--allow-file-access-from-files","--window-size=1920,1032",
               "--virtual-time-budget=1800",f"--screenshot={shot}",
               (OUT/"index.html").resolve().as_uri()]
        subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL,timeout=40)
        if not shot.is_file():
            raise RuntimeError("Browser did not write a screenshot")
        im = Image.open(shot).convert("RGB")
        if im.width < 1200 or im.height < 630:
            raise RuntimeError(f"Screenshot too small: {im.size}")
        # Only header and full elevation, never the site footer or browser UI.
        return im.crop((0,0,im.width,min(im.height,int(im.width*.468))))

def vector_fallback() -> Image.Image:
    import cairosvg
    png = cairosvg.svg2png(url=str(ROOT/"assets/home/house-line.svg"),
                           output_width=1120, output_height=840)
    drawing = Image.open(io.BytesIO(png)).convert("RGBA")
    canvas = Image.new("RGBA", SIZE, "white")
    drawing.thumbnail((1070,565),Image.Resampling.LANCZOS)
    canvas.alpha_composite(drawing,((SIZE[0]-drawing.width)//2,
                                    (SIZE[1]-drawing.height)//2+12))
    for name,x,height in (("logo-title-compact.svg",37,26),
                          ("logo-program-compact.svg",970,29)):
        logo = Image.open(io.BytesIO(cairosvg.svg2png(
            url=str(ROOT/"assets/home"/name),output_height=height))).convert("RGBA")
        canvas.alpha_composite(logo,(x,38))
    return canvas.convert("RGB")

def main() -> None:
    try:
        scene = browser_capture()
        print("Social preview: rendered the actual homepage")
    except Exception as exc:
        print(f"Browser unavailable ({exc}); rendering original SVG instead")
        scene = vector_fallback()
    scene.thumbnail(SIZE,Image.Resampling.LANCZOS)
    canvas = Image.new("RGB",SIZE,"white")
    canvas.paste(scene,((SIZE[0]-scene.width)//2,(SIZE[1]-scene.height)//2))
    TARGET.parent.mkdir(parents=True,exist_ok=True)
    canvas.save(TARGET,"JPEG",quality=86,optimize=True,
                progressive=True,subsampling=0)
    if Image.open(TARGET).size != SIZE:
        raise RuntimeError("Wrong social-preview dimensions")
    print(f"Social preview ready: {TARGET.relative_to(OUT)}, {TARGET.stat().st_size} bytes")

if __name__ == "__main__":
    main()
