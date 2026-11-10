"""Plain screenshots for Form A: no boxes, no labels, no borders.

Crop around text found on a page:
  python crop.py find <file.pdf> <page> "<text to find>" <out.png> [--above 40] [--below 120]
Crop an exact area (PDF points, from page.rect):
  python crop.py rect <file.pdf> <page> x0 y0 x1 y1 <out.png>
Join two crops for a comparison (duplicated paragraphs, same photo twice):
  python crop.py join <a.png> <b.png> <out.png> [--side]      (stacked unless --side)

Pages are counted from 1. Rendered at 130 dpi, as the skill requires.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pymupdf as fitz
from PIL import Image

DPI = 130


def _flag(args, name, default):
    if name in args:
        i = args.index(name)
        val = args[i + 1]
        del args[i:i + 2]
        return float(val)
    return default


def crop_rect(pdf, page_no, rect, out):
    doc = fitz.open(pdf)
    page = doc[page_no - 1]
    clip = fitz.Rect(rect) & page.rect
    page.get_pixmap(dpi=DPI, clip=clip, annots=True).save(out)
    print(f"saved {out} from page {page_no} area {tuple(round(v) for v in clip)}")


def crop_find(pdf, page_no, needle, out, above, below):
    doc = fitz.open(pdf)
    page = doc[page_no - 1]
    hits = page.search_for(needle)
    if not hits:
        words = needle.split()
        hits = page.search_for(" ".join(words[:4])) if len(words) > 4 else []
    if not hits:
        sys.exit(f"'{needle}' not found on page {page_no}. Check the text file for the exact wording.")
    r = fitz.Rect(hits[0])
    for h in hits[1:]:
        r |= h
    margin = 28
    clip = fitz.Rect(page.rect.x0 + margin, r.y0 - above, page.rect.x1 - margin, r.y1 + below)
    crop_rect(pdf, page_no, clip, out)


def join(a, b, out, side):
    ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    gap = 12
    if side:
        canvas = Image.new("RGB", (ia.width + ib.width + gap, max(ia.height, ib.height)), "white")
        canvas.paste(ia, (0, 0)); canvas.paste(ib, (ia.width + gap, 0))
    else:
        canvas = Image.new("RGB", (max(ia.width, ib.width), ia.height + ib.height + gap), "white")
        canvas.paste(ia, (0, 0)); canvas.paste(ib, (0, ia.height + gap))
    canvas.save(out)
    print(f"saved {out}")


def main(argv):
    args = list(argv)
    if not args:
        sys.exit(__doc__)
    mode = args.pop(0)
    if mode == "find":
        above, below = _flag(args, "--above", 40), _flag(args, "--below", 120)
        pdf, page, needle, out = args
        crop_find(pdf, int(page), needle, out, above, below)
    elif mode == "rect":
        pdf, page, x0, y0, x1, y1, out = args
        crop_rect(pdf, int(page), (float(x0), float(y0), float(x1), float(y1)), out)
    elif mode == "join":
        side = "--side" in args
        args = [a for a in args if a != "--side"]
        join(*args, side=side)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
