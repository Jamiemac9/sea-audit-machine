"""One round, start to finish: redact in -> (you check) -> Claude audits -> real details back out.

Storage, all on this computer under SA_HOME (default ~/SupportAudit):

    settings.json                 your choices (names to always hide, where to save forms)
    template/                     the blank Support_Audit_OG.docx
    reference/                    your reference files as uploaded            PRIVATE
    reference_redacted/           the copies Claude reads
    batches/<id>/batch.json       the round: residents, status, results
    batches/<id>/private/         uploads, the key, the report, originals     PRIVATE
    batches/<id>/claude/round/    the redacted round                          what Claude sees
    batches/<id>/claude/work/     Claude's working files and draft forms      what Claude writes

Claude Code is pointed only at claude/, the template and reference_redacted, and is
blocked from the PRIVATE folders by deny rules.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import shutil
import uuid
from pathlib import Path

import runner
from privacy.redact import redact_reference, redact_round
from privacy.reidentify import reidentify, text as reid_text

HOME = runner.HOME
BATCHES = HOME / "batches"
TEMPLATE_DIR = HOME / "template"
REFERENCE = HOME / "reference"
REFERENCE_RED = HOME / "reference_redacted"
INBOX = HOME / "inbox"
DEFAULT_OUT = Path.home() / "Documents" / "Support Audits"

for d in (BATCHES, TEMPLATE_DIR, REFERENCE, REFERENCE_RED, INBOX):
    d.mkdir(parents=True, exist_ok=True)


def settings() -> dict:
    s = runner.load_settings()
    s.setdefault("hide_names", [])
    s.setdefault("output_dir", str(DEFAULT_OUT))
    s.setdefault("check_before_sending", True)
    return s


def template_files() -> list[Path]:
    return sorted(p for p in TEMPLATE_DIR.glob("*.docx") if not p.name.startswith("~$"))


def template_path() -> Path | None:
    """The blank Form A. If other forms sit in the folder too, the one named like
    Support Audit wins (e.g. Support_Audit_OG.docx over Overall Feedback Form OG.docx)."""
    files = template_files()
    key = lambda p: re.sub(r"[^a-z]", "", p.stem.lower())
    for want in ("supportauditog", "supportaudit"):
        hits = [p for p in files if key(p).startswith(want)]
        if hits:
            return hits[0]
    others = ("feedback", "caseload", "overall")
    if len(files) == 1 and not any(o in key(files[0]) for o in others):
        return files[0]
    hits = [p for p in files if "supportaudit" in key(p) or "forma" in key(p)]
    return hits[0] if hits else None


def refresh_reference() -> dict:
    """Redact the reference files again (after any upload, removal, or files dropped in)."""
    return redact_reference(REFERENCE, REFERENCE_RED, HOME / "private_reference", settings()["hide_names"])


# ---------- batches ----------

def bdir(bid: str) -> Path:
    if not re.fullmatch(r"[a-f0-9]{12}", bid or ""):
        raise KeyError(bid)
    d = BATCHES / bid
    if not d.exists():
        raise KeyError(bid)
    return d


def load(bid: str) -> dict:
    return json.loads((bdir(bid) / "batch.json").read_text(encoding="utf-8"))


def save(b: dict):
    p = BATCHES / b["id"] / "batch.json"
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(b, indent=2), encoding="utf-8")
    tmp.replace(p)


def log(bid: str, label: str, line: str):
    with open(BATCHES / bid / "private" / f"log-{label or 'round'}.txt", "a", encoding="utf-8") as f:
        f.write(line.rstrip("\n") + "\n")


def read_log(bid: str, label: str) -> list[str]:
    p = bdir(bid) / "private" / f"log-{label or 'round'}.txt"
    return p.read_text(encoding="utf-8").splitlines() if p.exists() else []


def new_batch(resident_dirs: list[Path], ma: str, date: str, follow_up: bool, notes: str,
              extra_names: list[str]) -> dict:
    """resident_dirs are folders already copied into a staging area; they are moved in."""
    bid = uuid.uuid4().hex[:12]
    d = BATCHES / bid
    (d / "private" / "upload").mkdir(parents=True)
    (d / "claude").mkdir()
    residents = {}
    for r in resident_dirs:
        dest = d / "private" / "upload" / r.name
        shutil.move(str(r), dest)
        residents[r.name] = {"name": r.name, "status": "waiting"}
    b = {"id": bid, "created": dt.datetime.now().isoformat(timespec="seconds"), "status": "redacting",
         "ma": ma, "date": date or dt.date.today().strftime("%d/%m/%y"), "follow_up": follow_up,
         "notes": notes, "extra_names": extra_names, "residents": residents, "report": None}
    save(b)
    return b


def redact(bid: str) -> dict:
    """Redact in. Nothing leaves the computer here."""
    b = load(bid)
    d = bdir(bid)
    b["status"] = "redacting"
    save(b)
    out = d / "claude" / "round"
    if out.exists():
        shutil.rmtree(out)
    for old in (d / "private").glob("originals"):
        shutil.rmtree(old)
    dirs = {name: d / "private" / "upload" / name for name in b["residents"]}
    names = list(dict.fromkeys(settings()["hide_names"] + b.get("extra_names", [])))
    try:
        rep = redact_round(dirs, out, d / "private", names)
    except Exception as e:
        b["status"] = "failed"
        b["error"] = f"Redaction failed: {type(e).__name__}: {e}"
        save(b)
        return b
    key = json.loads((d / "private" / "key.json").read_text(encoding="utf-8"))
    for name, r in b["residents"].items():
        r["label"] = key["terms"][re.sub(r"\s+", " ", name.strip().lower())]
        r["status"] = "check" if not rep["leaks"] else "blocked"
    held = [f for f in rep["files"] if f.get("status") == "held back"]
    b["report"] = {"counts": rep["counts"], "held_back": held, "leaks": rep["leaks"],
                   "possible_names": rep["possible_names"][:200], "ner": rep["ner"], "ocr": rep["ocr"],
                   "office": rep["office"],
                   "files": [{k: f.get(k) for k in ("resident", "file", "as", "status", "reason")} for f in rep["files"]]}
    b["status"] = "blocked" if rep["leaks"] else "check"
    save(b)
    return b


def preview_files(bid: str) -> list[dict]:
    """Redacted files Claude would see, for the check screen."""
    root = bdir(bid) / "claude" / "round"
    out = []
    for p in sorted(root.rglob("*")):
        if p.is_file():
            out.append({"path": str(p.relative_to(root)).replace("\\", "/"), "type": p.suffix.lower()})
    return out


def preview_path(bid: str, rel: str) -> Path:
    root = (bdir(bid) / "claude" / "round").resolve()
    p = (root / rel).resolve()
    if root not in p.parents:
        raise KeyError(rel)
    return p


def approve(bid: str, labels: list[str] | None = None) -> list[str]:
    b = load(bid)
    if b["status"] == "blocked":
        raise ValueError("Redaction left identifying details in the copy. It cannot be sent.")
    queued = []
    for name, r in b["residents"].items():
        if labels and r["label"] not in labels:
            continue
        if r["status"] in ("check", "failed", "stopped", "done"):
            r["status"] = "queued"
            queued.append(name)
    b["status"] = "approved"
    save(b)
    return queued


def run_resident(bid: str, name: str, on_run=None) -> dict:
    """Claude audits one redacted file; then the real details go back in, on this computer."""
    b = load(bid)
    d = bdir(bid)
    r = b["residents"][name]
    label = r["label"].strip("[]")
    work = d / "claude" / "work" / label
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    t = template_path()
    redacted_out = work / f"Support Audit - {r['label']}.docx"
    skill = REFERENCE / "SKILL.md"
    job = {
        "label": r["label"], "folder": str(d / "claude" / "round" / label), "round": str(d / "claude" / "round"),
        "template": str(t) if t else "", "reference": str(REFERENCE_RED), "work": str(work),
        "output": str(redacted_out), "ma": b["ma"], "date": b["date"], "follow_up": b["follow_up"],
        "notes": reid_free(b["notes"], d), "skill_override": str(skill) if skill.exists() else "",
        "private_dirs": [str(d / "private"), str(REFERENCE), str(HOME / "private_reference"),
                         settings()["output_dir"]],
    }
    r["status"] = "running"
    r["started"] = dt.datetime.now().isoformat(timespec="seconds")
    save(b)
    run = runner.Run(job, settings(), lambda line: log(bid, label, line))
    if on_run:
        on_run(run)
    try:
        ok = run.start()
    except Exception as e:
        log(bid, label, f"! {type(e).__name__}: {e}")
        ok = False
    b = load(bid)
    r = b["residents"][name]
    if r["status"] == "stopping":
        r["status"] = "stopped"
        save(b)
        return r
    if not ok:
        r["status"] = "failed"
        save(b)
        return r
    # ---- redaction out: on this computer only ----
    out_dir = Path(settings()["output_dir"]).expanduser()
    if b.get("ma"):
        out_dir = out_dir / safe_name(b["ma"])
    final = out_dir / f"Support Audit - {name}.docx"
    n = 2
    while final.exists():
        final = out_dir / f"Support Audit - {name} ({n}).docx"
        n += 1
    try:
        info = reidentify(redacted_out, final, d / "private", work, d / "claude" / "round")
    except Exception as e:
        log(bid, label, f"! Putting the real details back failed: {type(e).__name__}: {e}")
        r["status"] = "failed"
        save(b)
        return r
    shutil.copy(final, d / "private" / final.name)
    display = json.loads((d / "private" / "key.json").read_text(encoding="utf-8"))["display"]
    r["result"] = reid_text(run.result_text, display)
    m = re.search(r"Rating:\W*(Gold|Green|Amber|Red)", r["result"] or "", re.I)
    r["rating"] = m.group(1).title() if m else None
    r["final"] = str(final)
    r["restore"] = info
    r["status"] = "done"
    r["finished"] = dt.datetime.now().isoformat(timespec="seconds")
    log(bid, label, f"Real details put back on this computer: {info['text_swaps']} names/details, "
                    f"{info['screenshots_restored']} screenshots. Saved: {final}")
    if info["placeholders_left"]:
        log(bid, label, f"! Placeholders still in the form (check by hand): {', '.join(info['placeholders_left'])}")
    save(b)
    return r


def reid_free(notes: str, d: Path) -> str:
    """Your notes go to Claude too: redact them with the round's key first."""
    if not notes:
        return ""
    key = json.loads((d / "private" / "key.json").read_text(encoding="utf-8"))
    out = notes
    for term, ph in sorted(key["terms"].items(), key=lambda kv: -len(kv[0])):
        out = re.sub(r"(?i)(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", ph, out)
    return out


def safe_name(s: str) -> str:
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", s).strip() or "Audits"


def delete(bid: str):
    shutil.rmtree(bdir(bid))
