"""End-to-end check of the tools on invented data. Nothing real, nothing written to the repo.

    python tests/test_tools.py

Builds a synthetic resident folder (sessions with a pasted signature image, a copied
paragraph, a ticked box, an impossible risk score of 11) and a mock form with floating
tables, then runs read_pack, inspect_template, crop, formkit and finish over them.
"""
from __future__ import annotations

import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import pymupdf as fitz
from docx import Document
from docx.oxml import OxmlElement
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn
from PIL import Image, ImageDraw

TOOLS = Path(__file__).resolve().parents[1] / "agent" / "tools"
sys.path.insert(0, str(TOOLS))
import formkit as fk  # noqa: E402

COPIED = ("Sam was supported to complete a weekly budget sheet and agreed to bring his bank "
          "statement to the next session so the plan could be checked together.")


def signature_png() -> bytes:
    im = Image.new("RGB", (220, 60), "white")
    ImageDraw.Draw(im).line([(10, 40), (60, 15), (110, 45), (200, 20)], fill="black", width=3)
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()


def make_pdf(path: Path, lines: list[str], sig: bytes | None = None, tick: bool = False):
    doc = fitz.open()
    page = doc.new_page()
    page.insert_textbox(fitz.Rect(50, 50, 545, 380), "\n".join(lines), fontsize=10)
    if sig:
        page.insert_image(fitz.Rect(50, 400, 270, 460), stream=sig)
    w = fitz.Widget()
    w.field_name, w.field_type = "Follow up required", fitz.PDF_WIDGET_TYPE_CHECKBOX
    w.rect, w.field_value = fitz.Rect(50, 480, 64, 494), tick
    page.add_widget(w)
    doc.save(path)


def make_resident(root: Path) -> Path:
    r = root / "Example Agent" / "1 Test Street" / "Sam Sample"
    (r / "2026-09-01").mkdir(parents=True)
    (r / "2026-09-08").mkdir()
    sig = signature_png()
    make_pdf(r / "WR-09 Risk Assessment.pdf", ["WR-09 Risk Assessment", "Risk: Financial exploitation",
             "Likelihood 3  Severity 4  Risk score: 11", "Risk Management Plan: monitor"])
    make_pdf(r / "WR-11 Support Plan.pdf", ["WR-11 Support Plan", "Goal 1: Manage money and budget",
             "Goal 2: Access healthcare services", "Goal 3: Maintain tenancy"])
    make_pdf(r / "2026-09-01" / "WR-13 Session 01-09-2026.pdf",
             ["WR-13 Support Session 01/09/2026", "Goal: Manage money", COPIED], sig, tick=True)
    make_pdf(r / "2026-09-08" / "WR-13 Session 08-09-2026.pdf",
             ["WR-13 Support Session 08/09/2026", "Goal: Manage money", COPIED], sig)
    return r


def make_form(path: Path):
    d = Document()
    n = d.styles["Normal"]  # the real template's trap: green, bold, 20.5pt, 8.4cm indent
    n.font.bold, n.font.size = True, Pt(20.5)
    n.font.color.rgb = RGBColor(0x5C, 0x82, 0x1E)
    n.paragraph_format.left_indent = Cm(8.4)
    d.sections[0].header.paragraphs[0].text = "SUPPORT AUDIT - FORM A"
    d.add_paragraph("Support Audit")
    t = d.add_table(rows=3, cols=2)
    for i, lab in enumerate(["Managing Agent:", "Resident Name:", "Audit Date:"]):
        t.cell(i, 0).text = lab
    c = d.add_table(rows=3, cols=2)
    for i, lab in enumerate(["WR-01 Licence Agreement", "WR-09 Risk Assessment", "SEA eligibility (5 goals)"]):
        c.cell(i, 0).text = lab
        c.cell(i, 1).text = "YES / NO / N/A"
    s = d.add_table(rows=4, cols=1)
    s.cell(0, 0).text = "What support has been given:"
    s.cell(1, 0).text = "Strengths:"
    s.cell(2, 0).text = "Next Steps:"
    s.cell(3, 0).text = "General Notes:"
    for tbl, x in ((t, "142"), (c, "142"), (s, "142")):
        tblpr = tbl._tbl.tblPr
        p = OxmlElement("w:tblpPr"); p.set(qn("w:tblpX"), x); p.set(qn("w:tblpY"), "300")
        tblpr.insert(1, p)
        ov = OxmlElement("w:tblOverlap"); ov.set(qn("w:val"), "never"); p.addnext(ov)
    d.save(path)


def run(*args):
    out = subprocess.run([sys.executable, *map(str, args)], capture_output=True, text=True)
    assert out.returncode == 0, out.stderr + out.stdout
    return out.stdout


def main():
    tmp = Path(tempfile.mkdtemp(prefix="sa-test-"))
    resident = make_resident(tmp)
    form = tmp / "Support_Audit_OG.docx"
    make_form(form)
    work = tmp / "work"

    print(run(TOOLS / "read_pack.py", resident, work / "pack").strip())
    pack = json.loads((work / "pack" / "pack.json").read_text())
    assert any("weekly budget sheet" in d["passage"] for d in pack["repeated_passages"]), "copied paragraph missed"
    assert any(r["file_count"] == 2 for r in pack["reused_images"]), "pasted signature missed"
    assert any(r["score"] == 11 for r in pack["impossible_risk_scores"]), "score 11 missed"
    ticks = [w for f in pack["files"] for w in f.get("widgets", []) if w["value"] == "TICKED"]
    assert len(ticks) == 1, ticks
    assert list((work / "pack" / "pages").glob("*.png")), "no page images"

    run(TOOLS / "inspect_template.py", form, work / "template-map.md")
    assert "FLOATING" in (work / "template-map.md").read_text()

    shots = work / "shots"; shots.mkdir()
    s1 = resident / "2026-09-01" / "WR-13 Session 01-09-2026.pdf"
    s2 = resident / "2026-09-08" / "WR-13 Session 08-09-2026.pdf"
    run(TOOLS / "crop.py", "find", s1, 1, "Sam was supported", shots / "a.png")
    run(TOOLS / "crop.py", "find", s2, 1, "Sam was supported", shots / "b.png")
    run(TOOLS / "crop.py", "join", shots / "a.png", shots / "b.png", shots / "dup.png")

    doc = fk.open_form(form)
    fk.fill(doc.tables[0].cell(0, 1), "Example Agent Ltd")
    fk.fill(doc.tables[0].cell(1, 1), "Sam Sample")
    fk.fill(doc.tables[0].cell(2, 1), "10/11/26")
    fk.choose(doc.tables[1].cell(0, 1), "N/A")
    fk.choose(doc.tables[1].cell(1, 1), "NO")
    fk.choose(doc.tables[1].cell(2, 1), "NO")
    sec = doc.tables[2]
    p = fk.heading_after(sec.cell(0, 0).paragraphs[0], "Support with Managing Money:")
    fk.text_after(p, "Supported to complete a weekly budget sheet and to check spending against it.")
    fk.bullets_after(sec.cell(1, 0).paragraphs[0], ["Hands-on budgeting support completed alongside the resident."])
    fk.bullets_after(sec.cell(2, 0).paragraphs[0], [("Progress the Money Goal", "move from completing the sheet together to prompting only.")])
    g = fk.heading_after(sec.cell(3, 0).paragraphs[0], "WR-13 Support Sessions", underline=True)
    g = fk.text_after(g, "It was identified that the sessions of 01/09/2026 and 08/09/2026 contain the same paragraph.")
    g = fk.screenshot_after(g, shots / "dup.png", "Same paragraph in two sessions")
    fk.placeholder_after(g, "File > Properties on the 08/09/2026 session: show the Created date")
    assert fk.unfloat(doc) == [0, 1, 2]
    out = fk.save(doc, resident / "Support Audit - Sam Sample.docx")

    # the YES/NO/N/A cell keeps the other words and highlights only the chosen one
    cell = Document(str(out)).tables[1].cell(1, 1)
    hi = [r.text for r in cell.paragraphs[0].runs if r.font.highlight_color]
    assert hi == ["NO"] and cell.text == "YES / NO / N/A", (hi, cell.text)

    added = [p for p in Document(str(out)).tables[2].cell(0, 0).paragraphs if p.text.startswith("Supported")][0]
    r = added.runs[0]
    assert r.font.bold is False and r.font.size == Pt(12) and r.font.name == "Aptos", "style leak"
    assert added.paragraph_format.left_indent == 0, "indent leak"
    print(run(TOOLS / "finish.py", out, work).strip())
    print(f"\nAll checks passed. Output in {tmp}")


if __name__ == "__main__":
    main()
