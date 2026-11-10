#!/usr/bin/env python3
"""Cache exhibition reference pictures on the public site as optimized WebP.

The sources correspond to the four research references supplied in the
exhibition statement. Original user uploads are not overwritten or changed.
"""
from __future__ import annotations
from hashlib import md5
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageOps

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / "assets" / "intro"
OUT.mkdir(parents=True, exist_ok=True)

filename = "TreeofArchitecture.jpg"
digest = md5(filename.encode()).hexdigest()
wikimedia = f"https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{filename}"

SOURCES = {
    1: [
        "https://newsimg.koreatimes.co.kr/2024/02/06/609fdfc6-fffc-409e-88af-8aca723188fa.jpg?w=728",
    ],
    2: [
        wikimedia,
        "https://commons.wikimedia.org/wiki/Special:FilePath/TreeofArchitecture.jpg",
    ],
    3: [
        "https://tacit-knowledge-architecture.com/wp-content/uploads/2023/08/Figure-3_Bernard-Rudofsky-Architecture-without-Architects-1964-moma.org_-1536x1168.jpg",
    ],
    4: [
        "https://miro.medium.com/v2/1%2At72P02lXvBZcDIsJwUpcwg.jpeg",
        "https://miro.medium.com/v2/resize:fit:1400/1*t72P02lXvBZcDIsJwUpcwg.jpeg",
    ],
}

def download(url):
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; HeteroFrontArchive/1.0)",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    })
    with urlopen(req, timeout=35) as response:
        return response.read()

def main():
    successes = 0
    for no, urls in SOURCES.items():
        target = OUT / f"figure-{no:02}.webp"
        if target.is_file() and target.stat().st_size > 2000:
            print(f"FIGURE {no}: already saved", flush=True)
            successes += 1
            continue
        for url in urls:
            try:
                raw = download(url)
                img = Image.open(BytesIO(raw))
                img.load()
                img = ImageOps.exif_transpose(img).convert("RGB")
                # The supplied press image has two architectural fragments:
                # use its left image, corresponding to the reference plate.
                if no == 1 and img.width > img.height * .85:
                    img = img.crop((0, 0, round(img.width / 2), img.height))
                if img.width > 1080:
                    img.thumbnail((1080, 1560), Image.Resampling.LANCZOS)
                img.save(target, "WEBP", quality=80, method=6)
                print(f"FIGURE {no}: {img.size}, {target.stat().st_size} bytes", flush=True)
                successes += 1
                break
            except Exception as exc:
                print(f"WARNING figure {no} source unavailable: {str(exc)[:220]}", flush=True)
        else:
            print(f"WARNING figure {no}: browser will use its original-source fallback", flush=True)
    if not successes:
        raise SystemExit("All external figure sources failed; no assets written.")
    print(f"Cached {successes}/4 figures", flush=True)

if __name__ == "__main__":
    main()
