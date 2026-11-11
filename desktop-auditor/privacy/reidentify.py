"""Redaction out: put the real details back into the finished form, on this computer only.

  - every [RESIDENT_A], [PERSON_2], [ADDRESS_1] ... in the form's text (body, tables,
    headers, footers) is swapped back to the real value, even where Word has split the
    placeholder across several runs
  - every screenshot Claude cut from a redacted page is re-cut from the original page,
    same page, same area, same resolution, so it drops into the same space
  - the file is saved under the resident's real name

The key comes from the private folder and is never sent anywhere.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

import pymupdf as fitz
from docx import Document
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "agent" / "tools"))
from crop import join_images  # noqa: E402

PH = re.compile(r"\[(?:RESIDENT|PERSON|ADDRESS|POSTCODE|PHONE|EMAIL|NI_NUMBER|NHS_NUMBER|DOB|BANK_DETAILS)_[A-Z0-9]+\]")


def load_key(private: Path) -> dict:
    return json.loads((private / "key.json").read_text(encoding="utf-8"))["display"]


def text(s: str, display: dict) -> str:
    return PH.sub(lambda m: display.get(m.group(0), m.group(0)), s or "")


def _paragraph(p, display) -> int:
    runs = p.runs
    full = "".join(r.text for r in runs)
    if "[" not in full:
        return 0
    n = 0
    # walk matches right to left so earlier offsets stay valid
    for m in reversed(list(PH.finditer(full))):
        value = display.get(m.group(0))
        if value is None:
            continue
        a, b = m.start(), m.end()
        pos = 0
        first = True
        for r in runs:
            t = r.text
            ra, rb = pos, pos + len(t)
            pos = rb
            if rb <= a or ra >= b:
                continue
            lo, hi = max(a, ra) - ra, min(b, rb) - ra
            if first:
                r.text = t[:lo] + value + t[hi:]
                first = False
            else:
                r.text = t[:lo] + t[hi:]
        n += 1
        full = "".join(r.text for r in runs)
    return n


def _all_paragraphs(doc):
    def walk(container):
        for p in container.paragraphs:
            yield p
        for t in getattr(container, "tables", []):
            for row in t.rows:
                for cell in row.cells:
                    yield from walk(cell)
    yield from walk(doc)
    for s in doc.sections:
        for part in (s.header, s.footer, s.first_page_header, s.first_page_footer):
            try:
                yield from walk(part)
            except Exception:
                pass


def _original_for(redacted_pdf: Path, report: dict, claude_round: Path) -> Path | None:
    try:
        rel = redacted_pdf.resolve().relative_to(claude_round.resolve())
    except ValueError:
        return None
    resident, rest = rel.parts[0], Path(*rel.parts[1:])
    for e in report["files"]:
        if e["resident"].strip("[]") == resident and Path(e["as"]) == rest and e.get("original_pdf"):
            return Path(e["original_pdf"])
    return None


def _recut(entry, shots_by_out, report, claude_round) -> Image.Image | None:
    if entry["kind"] == "crop":
        orig = _original_for(Path(entry["pdf"]), report, claude_round)
        if not orig or not orig.exists():
            return None
        page = fitz.open(orig)[entry["page"] - 1]
        pix = page.get_pixmap(dpi=entry["dpi"], clip=fitz.Rect(entry["rect"]), annots=True)
        return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    if entry["kind"] == "join":
        parts = [shots_by_out.get(entry[k]) for k in ("a", "b")]
        imgs = [_recut(p, shots_by_out, report, claude_round) if p else None for p in parts]
        if None in imgs:
            return None
        return join_images(imgs[0], imgs[1], entry["side"])
    return None


def swap_screenshots(doc, work: Path, report: dict, claude_round: Path) -> tuple[int, int]:
    shots = []
    for log in work.rglob("shots.json"):
        shots += json.loads(log.read_text())
    by_out = {s["out"]: s for s in shots}
    by_hash = {}
    for s in shots:
        p = Path(s["out"])
        if p.exists():
            by_hash[hashlib.sha256(p.read_bytes()).hexdigest()] = s
    swapped = missed = 0
    for rel in doc.part.rels.values():
        if "image" not in rel.reltype:
            continue
        part = rel.target_part
        entry = by_hash.get(hashlib.sha256(part.blob).hexdigest())
        if not entry:
            continue
        img = _recut(entry, by_out, report, claude_round)
        if img is None:
            missed += 1
            continue
        import io
        buf = io.BytesIO()
        img.save(buf, "PNG")
        part._blob = buf.getvalue()
        swapped += 1
    return swapped, missed


def reidentify(redacted_docx: Path, final_docx: Path, private: Path, work: Path, claude_round: Path) -> dict:
    display = load_key(private)
    report = json.loads((private / "redaction-report.json").read_text(encoding="utf-8"))
    doc = Document(str(redacted_docx))
    swapped_text = sum(_paragraph(p, display) for p in _all_paragraphs(doc))
    shots, missed = swap_screenshots(doc, work, report, claude_round)
    final_docx.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(final_docx))
    left = []
    for p in _all_paragraphs(Document(str(final_docx))):
        left += PH.findall(p.text)
    return {"text_swaps": swapped_text, "screenshots_restored": shots, "screenshots_left_redacted": missed,
            "placeholders_left": sorted(set(left))}
