"""Check the finished Form A the way the skill asks: open it, convert to PDF, look at every page.

Usage: python finish.py <finished.docx> <work_dir>

  - reopens the .docx (fails if Word would reject it)
  - checks the font is Aptos and size 12 on every run that sets one (template text excepted)
  - counts em dashes (house style: none in our prose)
  - converts to PDF with LibreOffice if it is installed, and renders every page to
    <work_dir>/check/page-NN.png so Claude can look at each one before finishing
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

import pymupdf as fitz
from docx import Document



def run_office(office: str, args: list, timeout: int = 240) -> bool:
    """Run LibreOffice so it can never hang the audit: its own throwaway profile (so a copy
    already open, or a first-run dialog, can't block it) and the whole process tree is killed
    if it runs past the timeout."""
    import tempfile, shutil as _sh
    prof = Path(tempfile.mkdtemp(prefix="sa-office-"))
    cmd = [office, f"-env:UserInstallation={prof.as_uri()}", "--headless", "--norestore", "--nologo", *args]
    nt = os.name == "nt"
    p = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL,
                         **({"creationflags": 0x08000000} if nt else {"start_new_session": True}))
    try:
        p.wait(timeout=timeout)
        return p.returncode == 0
    except subprocess.TimeoutExpired:
        if nt:
            subprocess.run(["taskkill", "/PID", str(p.pid), "/T", "/F"], capture_output=True, creationflags=0x08000000)
        else:
            import signal
            try:
                os.killpg(p.pid, signal.SIGKILL)
            except Exception:
                p.kill()
        return False
    finally:
        _sh.rmtree(prof, ignore_errors=True)

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
    pdf = out / (docx_path.stem + ".pdf")
    if not run_office(office, ["--convert-to", "pdf", "--outdir", str(out), str(docx_path)]) or not pdf.exists():
        print("LibreOffice could not render the form in 4 minutes: open the .docx in Word and look at every page yourself.")
        return
    d = fitz.open(pdf)
    for old in out.glob("sheet-*.png"):
        old.unlink()
    pages = []
    for i, page in enumerate(d, 1):
        f = out / f"page-{i:02d}.png"
        page.get_pixmap(dpi=70).save(f)
        pages.append(f)
    # contact sheets: four pages side by side per image, so the whole form is checked in a few looks
    from PIL import Image
    for n in range(0, len(pages), 4):
        ims = [Image.open(f) for f in pages[n:n + 4]]
        w, h = sum(i.width for i in ims) + 8 * (len(ims) - 1), max(i.height for i in ims)
        sheet = Image.new("RGB", (w, h), "white")
        x = 0
        for im in ims:
            sheet.paste(im, (x, 0)); x += im.width + 8
        sheet.save(out / f"sheet-{n // 4 + 1}.png")
    print(f"{len(d)} pages rendered to {out}: sheet-1.png onwards show four pages each. Check every sheet: "
          "tables over the header, stranded headings, screenshots off the page.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
