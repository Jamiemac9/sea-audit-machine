"""The Audit Scoring Framework, as fixed arithmetic.

Usage: python score.py <work>/score.json

score.json (written by Claude, placeholders not real names):
{
  "criteria": {
    "1": {"score": 2, "reason": "..."},   ... through "8"
  },
  "red_gate":                {"value": false, "reason": ""},
  "critical_doc_missing":    {"value": false, "reason": ""},
  "critical_doc_inaccurate": {"value": false, "reason": ""},
  "override": null            or {"band": "Amber", "reason": "..."}
}

Writes score-result.json next to it and prints the band. Scores are 0 to 3, starting at 2.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

GOLD_AT = 85
AMBER_BELOW = 60
BANDS = ("Gold", "Green", "Amber", "Red")

CRITERIA = {
    1: ("Support delivered", "Support delivered", 15, "WR-13, WR-14",
        ["Not evidenced (caps at Amber)", "Hour doubtful in places, or gaps between sessions",
         "Hour clearly justified, regular sessions", "Clearly exceeds the hour, regular sessions"]),
    2: ("Relevance", "Support delivered", 15, "WR-13 against WR-1, WR-9, WR-11",
        ["No link to needs (caps at Amber)", "Many sessions not linked", "Mostly linked",
         "Every session links to needs and goals"]),
    3: ("Progress and follow-up", "Support delivered", 10, "WR-13 follow-up section",
        ["Stalled, no follow-up", "Repetitive, little follow-up", "Some progression and follow-up",
         "Clear progression, every action revisited"]),
    4: ("Quality of support", "Support delivered", 10, "WR-13, attached evidence",
        ["Generic throughout, nothing practical", "Generic or discussion only",
         "Personalised, with some signposting or evidence",
         "Personalised, resident voice throughout, reputable signposting, practical help, evidence trail"]),
    5: ("Needs and risk", "Needs and planning documents", 15, "WR-1, WR-9, WR-10",
        ["Missing (caps at Amber)", "Gaps, all 0s or impossible scores", "Mostly accurate, matrix used",
         "Detailed and matching, valid matrix scores, plan for every 5+"]),
    6: ("Support plan and reviews", "Needs and planning documents", 15, "WR-11, WR-12",
        ["Missing (caps at Amber)", "Thin plans, goals not matching needs, or reviews late",
         "5 goals mostly matching needs, reviews in date",
         "5 active goals, detailed action plans, reviews up to date"]),
    7: ("Licence and Housing Benefit", "Tenancy, consent and safety", 10, "WR-2, WR-4, WR-6, WR-7",
        ["Licence or HB form missing (caps at Amber)", "Wrong rent, address or details (blocks Gold)",
         "Minor gap, such as a blank field", "Accurate, complete and signed"]),
    8: ("Signatures and safety", "Tenancy, consent and safety", 10, "Whole file, WR-3, WR-5, WR-19, WR-21, WR-22",
        ["No resident signatures anywhere (caps at Amber)", "Missing across several documents",
         "1 or 2 isolated gaps (advisory)", "All signed and complete"]),
}


def _flag(d, key):
    v = d.get(key) or {}
    return bool(v.get("value")) if isinstance(v, dict) else bool(v)


def compute(data: dict) -> dict:
    crit = data.get("criteria") or {}
    c = {}
    for i in CRITERIA:
        entry = crit.get(str(i), crit.get(i))
        if entry is None:
            raise ValueError(f"criterion {i} has no score")
        score = entry["score"] if isinstance(entry, dict) else entry
        score = int(score)
        if not 0 <= score <= 3:
            raise ValueError(f"criterion {i}: score {score} is not 0 to 3")
        c[i] = score
    w = {i: CRITERIA[i][2] for i in CRITERIA}
    support = (c[1] * w[1] + c[2] * w[2] + c[3] * w[3] + c[4] * w[4]) / 3
    needs = (c[5] * w[5] + c[6] * w[6]) / 3
    tenancy = (c[7] * w[7] + c[8] * w[8]) / 3
    total = round(support + needs + tenancy, 1)
    red, missing, inaccurate = (_flag(data, k) for k in ("red_gate", "critical_doc_missing", "critical_doc_inaccurate"))
    if red:
        band = "Red"
    elif missing or any(c[i] == 0 for i in (1, 2, 5, 6, 7, 8)) or total < AMBER_BELOW:
        band = "Amber"
    elif total >= GOLD_AT and min(c[1], c[2], c[3], c[4]) >= 2 and not inaccurate and c[7] >= 2:
        band = "Gold"
    else:
        band = "Green"
    ov = data.get("override") or None
    if ov and ov.get("band") not in BANDS:
        raise ValueError(f"override band must be one of {BANDS}")
    if ov and not (ov.get("reason") or "").strip():
        raise ValueError("an override needs a written reason")
    return {
        "scores": c, "support": round(support, 1), "needs": round(needs, 1), "tenancy": round(tenancy, 1),
        "total": total, "formula_band": band, "final_band": ov["band"] if ov else band,
        "red_gate": red, "critical_doc_missing": missing, "critical_doc_inaccurate": inaccurate,
        "override": ov,
    }


def main(path):
    p = Path(path)
    data = json.loads(p.read_text(encoding="utf-8"))
    res = compute(data)
    out = {"input": data, "result": res}
    (p.parent / "score-result.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Score {res['total']}/100 (support {res['support']}/50, needs and planning {res['needs']}/30, "
          f"tenancy and safety {res['tenancy']}/20). Formula band {res['formula_band']}; "
          f"final band {res['final_band']}{' (override)' if res['override'] else ''}.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
