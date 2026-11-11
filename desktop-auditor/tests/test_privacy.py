"""Privacy check on invented data: nothing identifying reaches the folder Claude sees,
and everything comes back in the finished form.   python tests/test_privacy.py"""
from __future__ import annotations

import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import pymupdf as fitz
from docx import Document
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / "agent" / "tools")]
from privacy.redact import redact_round, extract_text  # noqa: E402
from privacy.reidentify import reidentify  # noqa: E402
import formkit as fk  # noqa: E402

SECRETS = ["Grace Oldfield", "Sam Sample", "Sample", "Tina Test", "Jordan Patel", "14 Example Road", "B91 3QE",
           "07700 900123", "QQ 12 34 56 C", "01/02/1990", "sam.sample@example.com"]


def pdf(path, lines, widget=None, scanned=False):
    doc = fitz.open(); page = doc.new_page()
    if scanned:  # an image of text, no text layer
        img = Image.new("RGB", (1240, 400), "white"); d = ImageDraw.Draw(img)
        try: font = ImageFont.truetype("DejaVuSans.ttf", 40)
        except Exception: font = ImageFont.load_default()
        for i, l in enumerate(lines): d.text((40, 40 + i * 70), l, fill="black", font=font)
        b = io.BytesIO(); img.save(b, "PNG"); page.insert_image(fitz.Rect(30, 30, 565, 202), stream=b.getvalue())
    else:
        page.insert_textbox(fitz.Rect(50, 50, 545, 400), "\n".join(lines), fontsize=10)
    if widget:
        w = fitz.Widget(); w.field_name = "Worker"; w.field_type = fitz.PDF_WIDGET_TYPE_TEXT
        w.rect = fitz.Rect(50, 420, 300, 440); w.field_value = widget; page.add_widget(w)
    doc.set_metadata({"author": "Jordan Patel", "title": "Session for Sam Sample"})
    doc.save(path)


def build(root: Path):
    a = root / "Sam Sample"; b = root / "Tina Test"
    (a / "Sessions").mkdir(parents=True); b.mkdir()
    pdf(a / "WR-05 Sam Sample.pdf", ["WR-05 Personal details", "Name: Sam Sample", "DOB: 01/02/1990",
        "Address: 14 Example Road, Solihull B91 3QE", "Phone 07700 900123  Email sam.sample@example.com",
        "NI number QQ 12 34 56 C"])
    pdf(a / "Sessions" / "WR-13 07-09-2026.pdf", ["WR-13 Support Session 07/09/2026",
        "Support worker Jordan Patel met Sam at the Jobcentre. Sam was supported to complete a weekly budget sheet and agreed to bring his bank statement next week.",
        "Duration: 1 hour"], widget="Jordan Patel")
    pdf(a / "Sessions" / "WR-13 scan 14-09-2026.pdf", ["Session 14/09/2026", "Sam Sample attended with Jordan Patel"], scanned=True)
    d = Document(); d.add_paragraph("WR-11 Support Plan for Tina Test. Goal: manage money with Jordan Patel.")
    d.core_properties.last_modified_by = "Jordan Patel"; d.save(b / "WR-11 Tina Test.docx")
    pdf(b / "WR-13 08-09-2026.pdf", ["WR-13 Support Session 08/09/2026",
        "Sam was supported to complete a weekly budget sheet and agreed to bring his bank statement next week."])
    return {"Sam Sample": a, "Tina Test": b}


def found(hay: str) -> list[str]:
    import re
    return [s for s in SECRETS if re.search(r"(?<![A-Za-z0-9])" + re.escape(s.lower()) + r"(?![A-Za-z0-9])", hay.lower())]


def main():
    tmp = Path(tempfile.mkdtemp(prefix="privacy-"))
    dirs = build(tmp / "upload")
    claude = tmp / "claude" / "round"; private = tmp / "private"
    rep = redact_round(dirs, claude, private)
    print(json.dumps({k: rep[k] for k in ("counts", "leaks", "possible_names")}, indent=1))
    for f in rep["files"]: print(" ", f["resident"], f["file"], "->", f["as"], f.get("status"), f.get("reason", ""))

    # 1. nothing identifying anywhere in what Claude can see: names, text, metadata, form fields, OCR text
    problems = []
    for p in claude.rglob("*"):
        hay = p.name + ("\n" + extract_text(p) if p.is_file() else "")
        if p.suffix == ".txt": hay += p.read_text()
        if p.suffix == ".pdf":
            for page in fitz.open(p):  # also OCR what a reader would SEE on the page
                pix = page.get_pixmap(dpi=150)
                import pytesseract
                hay += "\n" + pytesseract.image_to_string(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
        bad = found(hay)
        if bad: problems.append((str(p.relative_to(claude)), bad))
    assert not problems, problems
    assert not rep["leaks"], rep["leaks"]
    print("No identifying details in the Claude folder (text, file names, metadata, fields, and OCR of the pages).")

    # session wording and dates survive, and the copied paragraph is still visibly shared
    t = extract_text(next(claude.rglob("*07-09-2026*")))
    assert "07/09/2026" in t and "weekly budget sheet" in t and "[RESIDENT_A]" in t, t
    t5 = extract_text(next(claude.rglob("WR-05*")))
    assert "[RESIDENT_A]" in t5 and "[DOB_1]" in t5 and "Name" in t5, t5  # labels kept, resident not a stranger

    # 2. Claude-like step: a form written with placeholders and a screenshot from the redacted page
    work = tmp / "claude" / "work"; shots = work / "shots"; shots.mkdir(parents=True)
    src = next(claude.rglob("*07-09-2026*"))
    subprocess.run([sys.executable, str(ROOT / "agent/tools/crop.py"), "find", str(src), "1", "weekly budget", str(shots / "s.png")], check=True)
    form = Document(); form.add_paragraph("Resident: ")
    p = form.paragraphs[0]; p.add_run("[RESI"); p.add_run("DENT_A] lives at "); p.add_run("[ADDRESS_1]")  # split across runs
    form.add_paragraph("Worker [PERSON_1] supported the resident.")
    form.add_paragraph().add_run().add_picture(str(shots / "s.png"))
    red = work / "Support Audit - [RESIDENT_A].docx"; form.save(red)

    final = tmp / "final" / "Support Audit - Sam Sample.docx"
    res = reidentify(red, final, private, work, claude)
    print(res)
    out = Document(str(final))
    txt = "\n".join(p.text for p in out.paragraphs)
    print(txt)
    assert "Sam Sample lives at 14 Example Road" in txt and "Jordan Patel" in txt, txt
    assert res["screenshots_restored"] == 1 and not res["placeholders_left"], res
    blob = [r.target_part.blob for r in out.part.rels.values() if "image" in r.reltype][0]
    import pytesseract
    seen = pytesseract.image_to_string(Image.open(io.BytesIO(blob)))
    assert "Sam" in seen and "[RESIDENT" not in seen, seen
    print("Real names and the original screenshot are back in the finished form.\nAll privacy checks passed:", tmp)


if __name__ == "__main__":
    main()
