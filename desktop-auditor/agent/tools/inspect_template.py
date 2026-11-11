"""Map the blank form before writing into it.

Usage: python inspect_template.py <Support_Audit_OG.docx> [out.md]

Lists every table, row and cell with its index, a text preview, whether the table floats,
and where the blank lines are, so the fill script can address cells exactly. Also lists body
paragraphs and the header/footer text (which must be left intact).
"""
from __future__ import annotations

import sys

from docx import Document
from docx.oxml.ns import qn


def main(path, out=None):
    doc = Document(path)
    lines = [f"# Template map: {path}", ""]
    for si, s in enumerate(doc.sections):
        h = " / ".join(p.text for p in s.header.paragraphs if p.text.strip())
        f = " / ".join(p.text for p in s.footer.paragraphs if p.text.strip())
        lines.append(f"Section {si}: header='{h}' footer='{f}' (leave intact)")
    lines.append("")
    lines.append("## Body paragraphs")
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip():
            lines.append(f" - para[{i}] '{p.text[:90]}'")
    lines.append("")
    for ti, t in enumerate(doc.tables):
        floats = t._tbl.tblPr.find(qn("w:tblpPr")) is not None
        lines.append(f"## tables[{ti}]  {len(t.rows)} rows x {len(t.columns)} cols{'  FLOATING' if floats else ''}")
        seen = set()
        for ri, row in enumerate(t.rows):
            for ci, cell in enumerate(row.cells):
                key = id(cell._tc)
                if key in seen:
                    continue  # merged cell already listed
                seen.add(key)
                paras = cell.paragraphs
                blanks = [i for i, p in enumerate(paras) if not p.text.strip()]
                txt = " | ".join(p.text.strip() for p in paras if p.text.strip())
                lines.append(f" - cell({ri},{ci}) '{txt[:110]}'  paras={len(paras)} blank={blanks}")
        lines.append("")
    text = "\n".join(lines)
    if out:
        open(out, "w", encoding="utf-8").write(text)
        print(f"wrote {out}")
    else:
        print(text)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(*sys.argv[1:3])
