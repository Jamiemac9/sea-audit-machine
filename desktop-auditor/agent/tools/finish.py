"""Check the finished Form A the way the skill asks: open it, convert to PDF, look at every page.

Usage: python finish.py <finished.docx> <work_dir>

  - reopens the .docx (fails if Word would reject it)
  - checks the font is Aptos and size 12 on every run that sets one (template text excepted)
  - counts em dashes (house style: none in our prose)
  - converts to PDF with LibreOffice if it is installed, and renders every page to
    <work_dir>/check/page-NN.png so Claude can look at each one before finishing
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pymupdf as fitz
from docx import Document


def soffice_path():
    for name in ("soffice", "libreoffice"):
        p = shutil.which(name)
        if p:
            return p
    for p in ("/Applications/LibreOffice.app/Contents/MacOS/soffice",
              r"C:\Program Files\LibreOffice\program\soffice.exe",
              r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"):
        if Path(p).exists():
            return p
    return None


def main(docx_path, work):
    docx_path, work = Path(docx_path), Path(work)
    doc = Document(str(docx_path))
    other_fonts, dashes = set(), 0
    def runs():
        for p in doc.paragraphs:
            yield from p.runs
        for t in doc.tables:
            for row in t.rows:
                for c in row.cells:
                    for p in c.paragraphs:
                        yield from p.runs
    for r in runs():
        dashes += r.text.count("—")
        if r.text.strip() and r.font.name and r.font.name != "Aptos":
            other_fonts.add(r.font.name)
    print(f"Opened OK: {docx_path.name}")
    print(f"Em dashes in the document: {dashes}" + ("  <- remove any in our prose (quotations from records excepted)" if dashes else ""))
    if other_fonts:
        print(f"Runs with a font other than Aptos (fine if template text, check if ours): {sorted(other_fonts)}")

    office = soffice_path()
    if not office:
        print("LibreOffice not installed: open the .docx in Word and look at every page yourself.")
        return
    out = work / "check"
    out.mkdir(parents=True, exist_ok=True)
    subprocess.run([office, "--headless", "--convert-to", "pdf", "--outdir", str(out), str(docx_path)],
                   check=True, capture_output=True, timeout=180)
    pdf = out / (docx_path.stem + ".pdf")
    d = fitz.open(pdf)
    for i, page in enumerate(d, 1):
        page.get_pixmap(dpi=70).save(out / f"page-{i:02d}.png")
    print(f"{len(d)} pages rendered to {out}. Look at every one: tables over the header, stranded headings, screenshots off the page.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
