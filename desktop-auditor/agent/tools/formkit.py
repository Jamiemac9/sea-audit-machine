"""The fixed way of writing into Support_Audit_OG.docx.

Claude decides the words. This module decides how they look, so every audit comes out the
same: Aptos 12, black, no indents, explicit bold off, yellow-highlighted YES/NO/N/A,
dash bullets with a hanging indent, 14.8 cm plain screenshots with grey italic captions,
and floating tables unfloated without breaking the schema order.

Use it from a small Python script written for the file being audited:

    import sys; sys.path.insert(0, r"<tools dir>")
    from formkit import *
    doc = open_form(r"<blank form>")
    t = doc.tables[3]                       # indexes from inspect_template.py
    choose(t.cell(2, 1), "NO")
    fill(t.cell(0, 1), "Example Housing Ltd")          # into the cell's own blank line
    p = heading_after(cell_par, "Support with Accessing Healthcare:")
    p = text_after(p, "Supported to register with the GP ...")
    p = bullets_after(p, ["Use of practical worksheets ...", ("Progress the Driving Licence Goal", "book the theory test ...")])
    p = screenshot_after(p, "work/shots/01.png", "WR-13 dated 07/09/26 repeats the opening of 31/08/26")
    p = placeholder_after(p, "File > Properties on WR-11: show the Created date")
    unfloat(doc, [5, 6])                    # only the tables that grow
    save(doc, r"<resident folder>\\Support Audit - <Name>.docx")
"""
from __future__ import annotations

import copy
import re
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from docx.text.paragraph import Paragraph

FONT = "Aptos"
SIZE = Pt(12)
BLACK = RGBColor(0, 0, 0)
GREY = RGBColor(0x59, 0x59, 0x59)
RED = RGBColor(0xC0, 0x00, 0x00)
SHOT_WIDTH = Cm(14.8)
CAPTION_SIZE = Pt(9)
BOLD_CHOICE = True   # SKILL.md: "highlight the chosen word (yellow text highlight + bold)"

_shot_counter = {"n": 0}

__all__ = ["open_form", "style_run", "style_par", "fill", "add_par", "par_after", "text_after",
           "heading_after", "rich_after", "bullets_after", "screenshot_after", "placeholder_after",
           "choose", "find_cells", "unfloat", "save", "clear_cell", "delete_par"]


# ---------- basics ----------

def open_form(path) -> Document:
    _shot_counter["n"] = 0
    return Document(str(path))


def style_run(run, bold=False, italic=False, underline=False, size=SIZE, color=BLACK):
    f = run.font
    f.name = FONT
    rpr = run._r.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.insert(0, rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        rfonts.set(qn(attr), FONT)
    for attr in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
        if rfonts.get(qn(attr)) is not None:
            del rfonts.attrib[qn(attr)]
    f.bold = bool(bold)          # explicit False, the template's Normal style is bold
    f.italic = bool(italic)
    f.underline = bool(underline)
    f.size = size
    f.color.rgb = color
    return run


def style_par(p: Paragraph, align=None, hanging: Cm | None = None):
    pf = p.paragraph_format
    pf.left_indent = hanging if hanging else Cm(0)
    pf.first_line_indent = -hanging if hanging else Cm(0)
    if align is not None:
        p.alignment = align
    return p


def _write(p: Paragraph, text: str, **kw):
    if text:
        style_run(p.add_run(text), **kw)
    return p


def par_after(p: Paragraph) -> Paragraph:
    """Insert a paragraph directly after p by cloning p's own paragraph formatting and
    stripping its runs (the template's spacing carries across; the green, bold, indented
    Normal style is never inherited). Alignment is reset to left and indents to 0."""
    new = copy.deepcopy(p._p)
    for child in list(new):
        if child.tag != qn("w:pPr"):
            new.remove(child)
    ppr = new.find(qn("w:pPr"))
    if ppr is not None:
        for tag in ("w:numPr", "w:keepNext", "w:pageBreakBefore"):
            el = ppr.find(qn(tag))
            if el is not None:
                ppr.remove(el)
    p._p.addnext(new)
    np = Paragraph(new, p._parent)
    np.alignment = WD_ALIGN_PARAGRAPH.LEFT
    style_par(np)
    return np


def add_par(container, text="", **kw) -> Paragraph:
    """Append a paragraph to a cell or the document body."""
    p = container.add_paragraph()
    style_par(p)
    return _write(p, text, **kw)


def fill(cell_or_par, text, **kw) -> Paragraph:
    """Write into the template's own blank line instead of adding a new one.
    For a cell: uses the first empty paragraph, or appends if there is none."""
    if isinstance(cell_or_par, Paragraph):
        p = cell_or_par
    else:
        empties = [p for p in cell_or_par.paragraphs if not p.text.strip()]
        p = empties[0] if empties else cell_or_par.add_paragraph()
    for r in list(p.runs):
        r._r.getparent().remove(r._r)
    style_par(p)
    return _write(p, text, **kw)


def text_after(p, text, **kw) -> Paragraph:
    return _write(par_after(p), text, **kw)


def heading_after(p, text, underline=False) -> Paragraph:
    """Bold heading, e.g. 'Support with Accessing Healthcare:' or an underlined
    General Notes heading 'WR-09 Risk Assessment' (underline=True)."""
    np = _write(par_after(p), text, bold=True, underline=underline)
    np.paragraph_format.keep_with_next = True
    return np


def rich_after(p, parts) -> Paragraph:
    """parts = [("Bold bit: ", {"bold": True}), ("plain bit", {})]"""
    np = par_after(p)
    for text, kw in parts:
        _write(np, text, **kw)
    return np


def bullets_after(p, items) -> Paragraph:
    """Dash bullets: '-' + tab with a hanging indent. An item may be a string or a
    (title, detail) pair, written 'Title: detail' with the title in bold."""
    hang = Cm(0.63)
    for item in items:
        np = par_after(p)
        style_par(np, hanging=hang)
        np.paragraph_format.tab_stops.add_tab_stop(hang)
        _write(np, "-\t")
        if isinstance(item, (tuple, list)):
            _write(np, f"{item[0]}: ", bold=True)
            _write(np, item[1])
        else:
            _write(np, item)
        p = np
    return p


def screenshot_after(p, png, caption) -> Paragraph:
    _shot_counter["n"] += 1
    pic = par_after(p)
    pic.add_run().add_picture(str(png), width=SHOT_WIDTH)
    cap = par_after(pic)
    _write(cap, f"Screenshot {_shot_counter['n']} – {caption}", italic=True, size=CAPTION_SIZE, color=GREY)
    return cap


def placeholder_after(p, where_and_what) -> Paragraph:
    return _write(par_after(p), f"[Insert screenshot: {where_and_what}]", bold=True, color=RED)


def delete_par(p: Paragraph):
    p._p.getparent().remove(p._p)


def clear_cell(cell):
    """Only when the template line genuinely has to go (e.g. unselected goal lines)."""
    for p in cell.paragraphs[1:]:
        delete_par(p)
    fill(cell.paragraphs[0], "")


# ---------- YES / NO / N/A ----------

def _split_run(run, start, end):
    """Split a run so text[start:end] is its own run; return that run."""
    text = run.text
    pieces = [text[:start], text[start:end], text[end:]]
    runs = []
    for piece in pieces:
        r = copy.deepcopy(run._r)
        for t in r.findall(qn("w:t")):
            r.remove(t)
        t = OxmlElement("w:t")
        t.text = piece
        t.set(qn("xml:space"), "preserve")
        r.append(t)
        runs.append(r)
    anchor = run._r
    for r in runs:
        anchor.addprevious(r)
    anchor.getparent().remove(anchor)
    from docx.text.run import Run
    return Run(runs[1], run._parent), runs


def choose(cell, word: str):
    """Highlight the chosen word (YES, NO or N/A) inside a checklist cell, in place.
    Leaves the cell unshaded and every other word untouched."""
    word = word.upper().strip()
    pattern = re.compile(rf"(?<![A-Z/]){re.escape(word)}(?![A-Z/])")
    for p in cell.paragraphs:
        for run in list(p.runs):
            m = pattern.search(run.text.upper())
            if not m:
                continue
            target = run
            if run.text.strip().upper() != word:
                target, parts = _split_run(run, m.start(), m.end())
                for r in parts:
                    if not "".join(t.text or "" for t in r.findall(qn("w:t"))):
                        r.getparent().remove(r)
            target.font.highlight_color = WD_COLOR_INDEX.YELLOW
            target.font.bold = BOLD_CHOICE
            return target
    raise ValueError(f"'{word}' not found in cell: {cell.text!r}")


# ---------- finding things ----------

def find_cells(doc, label: str):
    """Every (table_index, row, col, cell) whose text contains label, case-insensitive."""
    out, seen = [], set()
    for ti, t in enumerate(doc.tables):
        for ri, row in enumerate(t.rows):
            for ci, cell in enumerate(row.cells):
                if id(cell._tc) in seen:
                    continue
                seen.add(id(cell._tc))
                if label.lower() in cell.text.lower():
                    out.append((ti, ri, ci, cell))
    return out


# ---------- floating tables ----------

_AFTER_TBLIND = ["w:tblBorders", "w:shd", "w:tblLayout", "w:tblCellMar", "w:tblLook",
                 "w:tblCaption", "w:tblDescription"]


def unfloat(doc, indexes=None):
    """Remove tblpPr/tblOverlap and keep the table where it was with tblInd = old tblpX.
    Pass only the tables that grow with content (on Form A: Support Delivered and General
    Notes) plus any other you have seen break across the header in the check pages.
    Unfloating everything displaces the whole page. indexes=None unfloats every table."""
    done = []
    for i, t in enumerate(doc.tables):
        if indexes is not None and i not in indexes:
            continue
        tblPr = t._tbl.tblPr
        tblp = tblPr.find(qn("w:tblpPr"))
        if tblp is None:
            continue
        x = tblp.get(qn("w:tblpX")) or "0"
        tblPr.remove(tblp)
        ov = tblPr.find(qn("w:tblOverlap"))
        if ov is not None:
            tblPr.remove(ov)
        ind = tblPr.find(qn("w:tblInd"))
        if ind is None:
            ind = OxmlElement("w:tblInd")
            anchor = next((tblPr.find(qn(n)) for n in _AFTER_TBLIND if tblPr.find(qn(n)) is not None), None)
            if anchor is not None:
                anchor.addprevious(ind)
            else:
                tblPr.append(ind)
        ind.set(qn("w:w"), x)
        ind.set(qn("w:type"), "dxa")
        for cell in t.rows[0].cells:  # keep the table's heading row with what follows
            for par in cell.paragraphs:
                par.paragraph_format.keep_with_next = True
        done.append(i)
    return done


def save(doc, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(path))
    Document(str(path))  # reopen: fails loudly if the file is broken
    print(f"saved {path}")
    return path
