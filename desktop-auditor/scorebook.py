"""The scoring workbook for a round, built on this computer after real names are back.

Tabs, as in the Audit Scoring Framework sheet:
  Audits       one row per resident, with the framework's own formulas
  Weights      thresholds, weights and the 0-3 descriptors
  MA Summary   the managing agent's averages and band counts
  then one breakdown tab per resident: band, score, sections, each criterion's score,
  what that score means and why it was given, the gates and any override.
"""
from __future__ import annotations

import datetime as dt
import re
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

sys.path.insert(0, str(Path(__file__).resolve().parent / "agent" / "tools"))
from score import AMBER_BELOW, CRITERIA, GOLD_AT  # noqa: E402

BAND_FILL = {"Gold": "FDE68A", "Green": "BBF7D0", "Amber": "FED7AA", "Red": "FECACA"}
BOLD = Font(bold=True)
HEAD = PatternFill("solid", fgColor="E5E7EB")
WRAP = Alignment(wrap_text=True, vertical="top")

AUDIT_HEAD = ["File ref", "Managing Agent", "Audit date", "Final band", "Formula band", "Score /100",
              "Support /50", "Needs & planning /30", "Tenancy & safety /20", "Red gate",
              "Critical doc missing", "Critical doc inaccurate", "1 Support delivered", "2 Relevance",
              "3 Progress & follow-up", "4 Quality of support", "5 Needs & risk",
              "6 Support plan & reviews", "7 Licence & HB", "8 Signatures & safety", "Override band",
              "Override reason", "Notes"]


def _tab_name(name: str, used: set) -> str:
    base = re.sub(r"[\[\]:*?/\\]", "", name)[:24].strip() or "Resident"
    t, n = base, 2
    while t.lower() in used:
        t = f"{base[:21]} {n}"
        n += 1
    used.add(t.lower())
    return t


def _date(s: str):
    for fmt in ("%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except (TypeError, ValueError):
            continue
    return s


def build(path: Path, ma: str, audit_date: str, residents: list[dict]):
    """residents: [{"name", "score": {"input": ..., "result": ...}}] with real names and reasons."""
    wb = Workbook()
    a = wb.active
    a.title = "Audits"
    w = wb.create_sheet("Weights")
    m = wb.create_sheet("MA Summary")

    # ---- Weights ----
    w["A1"], w["B1"] = "Gold at or above", GOLD_AT
    w["A2"], w["B2"] = "Amber below", AMBER_BELOW
    w["A3"], w["B3"] = "Weights total (must be 100)", "=SUM(C6:C13)"
    for col, h in enumerate(["Criterion", "Section", "Weight", "Where to look", "3 = above expectations",
                             "2 = expected standard (start here)", "1 = noticeably weak", "0 = absent"], 1):
        cell = w.cell(5, col, h)
        cell.font, cell.fill = BOLD, HEAD
    for i, (name, section, weight, where, levels) in CRITERIA.items():
        r = 5 + i
        w.cell(r, 1, f"{i}. {name}"); w.cell(r, 2, section); w.cell(r, 3, weight); w.cell(r, 4, where)
        for k, lvl in enumerate(reversed(levels)):
            w.cell(r, 5 + k, lvl).alignment = WRAP
    for col, width in zip("ABCDEFGH", (28, 26, 9, 30, 34, 34, 34, 30)):
        w.column_dimensions[col].width = width
    w.freeze_panes = "A6"

    # ---- Audits ----
    for col, h in enumerate(AUDIT_HEAD, 1):
        c = a.cell(1, col, h)
        c.font, c.fill, c.alignment = BOLD, HEAD, WRAP
    a.freeze_panes = "B2"
    for idx, res in enumerate(residents):
        r = idx + 2
        inp, out = res["score"]["input"], res["score"]["result"]
        sc = out["scores"]
        ov = out.get("override") or {}
        a.cell(r, 1, res["name"]); a.cell(r, 2, ma); a.cell(r, 3, _date(audit_date))
        a.cell(r, 3).number_format = "dd/mm/yyyy"
        a.cell(r, 4, f'=IF($A{r}="","",IF(U{r}<>"",U{r},E{r}))')
        a.cell(r, 5, f'=IF($A{r}="","",IF(J{r},"Red",IF(OR(K{r},M{r}=0,N{r}=0,Q{r}=0,R{r}=0,S{r}=0,T{r}=0,'
                     f'F{r}<Weights!$B$2),"Amber",IF(AND(F{r}>=Weights!$B$1,MIN(M{r}:P{r})>=2,NOT(L{r}),S{r}>=2),'
                     f'"Gold","Green"))))')
        a.cell(r, 6, f'=IF($A{r}="","",ROUND(G{r}+H{r}+I{r},1))')
        a.cell(r, 7, f'=IF($A{r}="","",(M{r}*Weights!$C$6+N{r}*Weights!$C$7+O{r}*Weights!$C$8+P{r}*Weights!$C$9)/3)')
        a.cell(r, 8, f'=IF($A{r}="","",(Q{r}*Weights!$C$10+R{r}*Weights!$C$11)/3)')
        a.cell(r, 9, f'=IF($A{r}="","",(S{r}*Weights!$C$12+T{r}*Weights!$C$13)/3)')
        for col in (7, 8, 9):
            a.cell(r, col).number_format = "0.0"
        a.cell(r, 10, out["red_gate"]); a.cell(r, 11, out["critical_doc_missing"]); a.cell(r, 12, out["critical_doc_inaccurate"])
        for i in range(1, 9):
            a.cell(r, 12 + i, sc[str(i)] if str(i) in sc else sc[i])
        a.cell(r, 21, ov.get("band") or None); a.cell(r, 22, ov.get("reason") or None)
        a.cell(r, 23, f"Breakdown on the '{res['tab']}' tab")
        fill = BAND_FILL.get(out["final_band"])
        if fill:
            a.cell(r, 4).fill = PatternFill("solid", fgColor=fill)
    dv = DataValidation(type="list", formula1='"Gold,Green,Amber,Red"', allow_blank=True)
    a.add_data_validation(dv)
    dv.add(f"U2:U{max(2, len(residents) + 1)}")
    for col in range(1, len(AUDIT_HEAD) + 1):
        a.column_dimensions[get_column_letter(col)].width = 14
    a.column_dimensions["A"].width = 26; a.column_dimensions["V"].width = 40; a.column_dimensions["W"].width = 30

    # ---- MA Summary ----
    heads = ["Managing Agent", "Files audited", "Avg score", "Gold", "Green", "Amber", "Red", "% Amber or Red",
             "Avg support /50", "Avg needs & planning /30", "Avg tenancy & safety /20"]
    for col, h in enumerate(heads, 1):
        c = m.cell(1, col, h)
        c.font, c.fill, c.alignment = BOLD, HEAD, WRAP
    m["A2"] = ma or "Managing agent"
    m["B2"] = '=COUNTIF(Audits!$B:$B,$A2)'
    m["C2"] = '=IFERROR(AVERAGEIF(Audits!$B:$B,$A2,Audits!$F:$F),"")'
    for col, band in zip("DEFG", ("Gold", "Green", "Amber", "Red")):
        m[f"{col}2"] = f'=COUNTIFS(Audits!$B:$B,$A2,Audits!$D:$D,"{band}")'
    m["H2"] = '=IFERROR((F2+G2)/B2,"")'
    m["H2"].number_format = "0%"
    for col, src in zip("IJK", "GHI"):
        m[f"{col}2"] = f'=IFERROR(AVERAGEIF(Audits!$B:$B,$A2,Audits!${src}:${src}),"")'
    for col in "CIJK":
        m[f"{col}2"].number_format = "0.0"
    for col in range(1, 12):
        m.column_dimensions[get_column_letter(col)].width = 15
    m.column_dimensions["A"].width = 28

    # ---- one breakdown tab per resident ----
    for res in residents:
        inp, out = res["score"]["input"], res["score"]["result"]
        t = wb.create_sheet(res["tab"])
        t["A1"] = f"Audit Score - {res['name']}"
        t["A1"].font = Font(bold=True, size=14)
        rows = [("Managing agent", ma), ("Audit date", audit_date), ("Final band", out["final_band"]),
                ("Score", f"{out['total']} / 100"),
                ("Support delivered", f"{out['support']} / 50"),
                ("Needs and planning", f"{out['needs']} / 30"),
                ("Tenancy, consent and safety", f"{out['tenancy']} / 20")]
        for k, (label, val) in enumerate(rows, 3):
            t.cell(k, 1, label).font = BOLD
            t.cell(k, 2, val)
        fill = BAND_FILL.get(out["final_band"])
        if fill:
            t["B5"].fill = PatternFill("solid", fgColor=fill)
            t["B5"].font = BOLD
        r = 11
        for col, h in enumerate(["Criterion", "Weight", "Score (0-3)", "What that score means", "Why"], 1):
            c = t.cell(r, col, h)
            c.font, c.fill = BOLD, HEAD
        for i, (name, section, weight, where, levels) in CRITERIA.items():
            r += 1
            entry = inp["criteria"].get(str(i), inp["criteria"].get(i))
            score = out["scores"].get(str(i), out["scores"].get(i))
            t.cell(r, 1, f"{i}. {name}"); t.cell(r, 2, weight); t.cell(r, 3, score)
            t.cell(r, 4, levels[score]).alignment = WRAP
            t.cell(r, 5, (entry or {}).get("reason", "") if isinstance(entry, dict) else "").alignment = WRAP
        r += 2
        for label, key in (("Red gate", "red_gate"), ("Critical document missing", "critical_doc_missing"),
                           ("Critical document inaccurate", "critical_doc_inaccurate")):
            g = inp.get(key) or {}
            t.cell(r, 1, label).font = BOLD
            t.cell(r, 3, "Yes" if out[key] else "No")
            t.cell(r, 5, g.get("reason", "") if isinstance(g, dict) else "").alignment = WRAP
            r += 1
        r += 1
        t.cell(r, 1, "Formula band").font = BOLD
        t.cell(r, 3, out["formula_band"])
        if out.get("override"):
            r += 1
            t.cell(r, 1, "Override").font = BOLD
            t.cell(r, 3, out["override"]["band"])
            t.cell(r, 5, out["override"]["reason"]).alignment = WRAP
        for col, width in zip("ABCDE", (32, 9, 12, 44, 70)):
            t.column_dimensions[col].width = width

    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)
    return path


def tab_names(names: list[str]) -> list[str]:
    used = {"audits", "weights", "ma summary"}
    return [_tab_name(n, used) for n in names]
