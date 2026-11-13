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
import time
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
    if s.get("flow") != 2:  # from now on: drop, run, save. The check step is opt-in.
        s["flow"] = 2
        s["check_before_sending"] = False
        try:
            runner.save_settings(s)
        except Exception:
            pass
    s.setdefault("check_before_sending", False)
    return s


def template_files() -> list[Path]:
    return sorted(p for p in TEMPLATE_DIR.glob("*.docx") if not p.name.startswith("~$"))


def feedback_template_path() -> Path | None:
    """The blank Overall Feedback Form, from the same template folder."""
    for p in template_files():
        k = re.sub(r"[^a-z]", "", p.stem.lower())
        if "overallfeedback" in k or k.startswith("feedback"):
            return p
    return None


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


STAGES = [("Loading the audit skill", "Reading the instructions"), ("Reading documents", "Reading the file"),
          ("Mapping the form", "Working out the findings"), ("Cutting a screenshot", "Cutting screenshots"),
          ("Filling the form", "Filling in the form"), ("Scoring the file", "Scoring"),
          ("Checking the finished form", "Checking every page"), ("Real details put back", "Putting names back")]


def activity(bid: str, label: str) -> dict:
    """How far a running audit has got, read from its progress log (for the dashboard)."""
    lines = read_log(bid, label)
    if "--- Retry ---" in "\n".join(lines):
        lines = lines[max(i for i, l in enumerate(lines) if "--- Retry ---" in l):]
    reached = -1
    for line in lines:
        for i, (marker, _) in enumerate(STAGES):
            if marker in line and i > reached:
                reached = i
    p = bdir(bid) / "private" / f"log-{label or 'round'}.txt"
    quiet = int(time.time() - p.stat().st_mtime) if p.exists() else None
    last = next((l.strip() for l in reversed(lines) if l.strip() and not l.startswith("  >")), "")
    return {"step": reached + 1, "of": len(STAGES), "doing": STAGES[reached][1] if reached >= 0 else "Starting",
            "quiet_seconds": quiet, "last": last[:160]}


def read_log(bid: str, label: str) -> list[str]:
    p = bdir(bid) / "private" / f"log-{label or 'round'}.txt"
    return p.read_text(encoding="utf-8").splitlines() if p.exists() else []


def new_batch(resident_dirs: list[Path], ma: str, date: str, follow_up: bool, notes: str,
              extra_names: list[str], source: str | None = None) -> dict:
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
         "notes": notes, "extra_names": extra_names, "residents": residents, "report": None,
         "source": source, "feedback": {"status": "waiting"}}
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
        prog = d / "private" / "progress.txt"
        state = {"file": ""}

        def say(msg):
            if msg.startswith(("Finding", "Hiding")):
                state["file"] = msg
            else:
                msg = f"{state['file']}, {msg}"
            prog.write_text(msg, encoding="utf-8")
        import privacy.redact as _r
        _r.PROGRESS = say
        rep = redact_round(dirs, out, d / "private", names)
    except Exception as e:
        b["status"] = "failed"
        b["error"] = f"Redaction failed: {type(e).__name__}: {e}"
        save(b)
        return b
    key = json.loads((d / "private" / "key.json").read_text(encoding="utf-8"))
    if rep["leaks"]:
        _withhold_leaks(rep, out, d / "private")
    held = [f for f in rep["files"] if f.get("status") == "held back"]
    for name, r in b["residents"].items():
        r["label"] = key["terms"][re.sub(r"\s+", " ", name.strip().lower())]
        r["status"] = "check" if not rep["leaks"] else "blocked"
        r.pop("error", None)
        mine = [f for f in rep["files"] if f.get("resident") == r["label"]]
        readable = [f for f in mine if f.get("status") not in ("held back",)]
        r["documents"] = len(readable)
        if not readable:
            r["status"] = "empty"
            why = sorted({f"{Path(f['file']).name}: {f.get('reason')}" for f in mine})[:6]
            r["error"] = ("No documents could be read for this resident, so there is nothing to audit."
                          + (" Held back: " + "; ".join(why) if why else " The folder was empty."))
    b["report"] = {"counts": rep["counts"], "held_back": held, "leaks": rep["leaks"],
                   "leak_detail": rep.get("leak_detail", []),
                   "possible_names": rep["possible_names"][:200], "ner": rep["ner"], "ocr": rep["ocr"],
                   "office": rep["office"],
                   "files": [{k: f.get(k) for k in ("resident", "file", "as", "status", "reason")} for f in rep["files"]]}
    b["status"] = "blocked" if rep["leaks"] else "check"
    save(b)
    return b


def _withhold_leaks(rep: dict, out: Path, private: Path):
    """A file where a hidden detail survived is kept off Claude's copy, so the round can carry
    on safely instead of stopping. It is listed as held back in the check and the report."""
    bad = {lk["file"] for lk in rep["leaks"]}
    keep = private / "withheld"
    for rel in sorted(bad, key=len, reverse=True):
        p = out / rel
        if p.is_file():
            dest = keep / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(p), dest)
    for f in rep["files"]:
        if not f.get("as") or f.get("status") == "held back":
            continue
        base = (Path(f["resident"].strip("[]")) / Path(f["as"]).with_suffix("")).as_posix()
        hit = sorted({lk["found"] for lk in rep["leaks"] if Path(lk["file"]).as_posix().startswith(base)})
        if hit:
            f.update(status="held back", reason=f"{', '.join(hit[:4])} could not be hidden in it, so Claude did not see it")
    rep["withheld"] = sorted(bad)
    rep["leak_detail"] = [{k: lk.get(k) for k in ("file", "found", "shape", "where")} for lk in rep["leaks"]]
    # anything still showing (for example in a folder name) does stop the round
    rep["leaks"] = [lk for lk in rep["leaks"] if not (out / lk["file"]).is_file() and (out / lk["file"]).exists()]


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
            r.pop("error", None)
            r.pop("tries", None)
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
                         settings()["output_dir"], str(out_dir(b))],
    }
    r["status"] = "running"
    r["started"] = dt.datetime.now().isoformat(timespec="seconds")
    r.pop("error", None)
    r.pop("finished", None)
    save(b)
    run = runner.Run(job, settings(), lambda line: log(bid, label, line))
    if on_run:
        on_run(run)
    try:
        ok = run.start()
    except Exception as e:
        log(bid, label, f"! {type(e).__name__}: {e}")
        run.error = run.error or f"The app hit an error: {type(e).__name__}: {e}"
        ok = False
    b = load(bid)
    r = b["residents"][name]
    r["finished"] = dt.datetime.now().isoformat(timespec="seconds")
    if r["status"] == "stopping":
        r["status"] = "stopped"
        r["error"] = "You stopped this audit."
        save(b)
        return r
    if not ok:
        r["status"] = "failed"
        r["error"] = _readable(bid, run.error or "Claude stopped without saving the form.")
        save(b)
        return r
    # ---- redaction out: on this computer only ----
    final = _unique(out_dir(b) / f"Support Audit - {name}.docx")
    try:
        info = reidentify(redacted_out, final, d / "private", work, d / "claude" / "round")
    except Exception as e:
        log(bid, label, f"! Putting the real details back failed: {type(e).__name__}: {e}")
        r["status"] = "failed"
        r["error"] = f"The form was made, but putting the real names back failed: {type(e).__name__}: {e}"
        save(b)
        return r
    shutil.copy(final, d / "private" / final.name)
    display = json.loads((d / "private" / "key.json").read_text(encoding="utf-8"))["display"]
    r["result"] = reid_text(run.result_text, display)
    m = re.search(r"Rating:\W*(Gold|Green|Amber|Red)", r["result"] or "", re.I)
    r["rating"] = m.group(1).title() if m else None
    scored = work / "score-result.json"
    if scored.exists():
        try:
            r["score"] = _reid_obj(json.loads(scored.read_text(encoding="utf-8")), display)
            r["rating"] = r["score"]["result"]["final_band"]
            r["total"] = r["score"]["result"]["total"]
        except Exception as e:
            log(bid, label, f"! Could not read the score: {e}")
    r["final"] = str(final)
    r["restore"] = info
    r["status"] = "done"
    r["finished"] = dt.datetime.now().isoformat(timespec="seconds")
    log(bid, label, f"Real details put back on this computer: {info['text_swaps']} names/details, "
                    f"{info['screenshots_restored']} screenshots. Saved: {final}")
    if info["placeholders_left"]:
        log(bid, label, f"! Placeholders still in the form (check by hand): {', '.join(info['placeholders_left'])}")
    save(b)
    if r.get("score"):
        try:
            p = build_scorebook(bid)
            log(bid, label, f"Scoring workbook updated: {p}")
        except Exception as e:
            log(bid, label, f"! Scoring workbook could not be written: {type(e).__name__}: {e}")
    return r


def _readable(bid: str, text: str) -> str:
    """Error text shown on this computer, with the real names back in."""
    try:
        display = json.loads((bdir(bid) / "private" / "key.json").read_text(encoding="utf-8"))["display"]
        return reid_text(text, display)
    except Exception:
        return text


def write_report(bid: str) -> Path | None:
    """The delivered report: one page in Completed Audits saying what came out of the round,
    what did not and why. Rewritten every time something in the round finishes."""
    import html
    b = load(bid)
    out = out_dir(b)
    try:
        out.mkdir(parents=True, exist_ok=True)
    except OSError:
        return None
    esc = html.escape
    rows, done, failed = [], 0, 0
    for name, r in sorted(b["residents"].items()):
        st = r.get("status")
        done += st == "done"
        failed += st in ("failed", "empty", "stopped")
        form = Path(r["final"]).name if r.get("final") and Path(r["final"]).exists() else ""
        word = {"done": "Delivered", "failed": "Not finished", "empty": "Nothing to audit", "stopped": "Stopped",
                "running": "In progress", "queued": "Waiting its turn", "check": "Waiting for your check",
                "blocked": "Blocked by redaction"}.get(st, st or "")
        band = r.get("rating") or ""
        score = f"{r['total']:.0f}/100" if isinstance(r.get("total"), (int, float)) else ""
        link = f'<a href="{esc(form)}">{esc(form)}</a>' if form else ""
        why = esc(r.get("error") or "")
        rows.append(f"<tr class='{esc(st or '')}'><td>{esc(name)}</td><td>{esc(word)}</td>"
                    f"<td><span class='band {esc(band.lower())}'>{esc(band)}</span></td><td>{score}</td>"
                    f"<td>{link}</td><td class='why'>{why}</td></tr>")
    extras = []
    if b.get("scorebook") and Path(b["scorebook"]).exists():
        sb = Path(b["scorebook"])
        extras.append(f'<li>Scores workbook: <a href="{esc(sb.as_uri())}">{esc(sb.name)}</a></li>')
    fb = b.get("feedback") or {}
    if fb.get("final") and Path(fb["final"]).exists():
        extras.append(f'<li>Overall Feedback Form: <a href="{esc(Path(fb["final"]).name)}">{esc(Path(fb["final"]).name)}</a></li>')
    elif fb.get("status") in ("failed", "stopped"):
        extras.append(f"<li>Overall Feedback Form: not finished. {esc(fb.get('error') or '')}</li>")
    elif fb.get("status") in ("queued", "running"):
        extras.append("<li>Overall Feedback Form: being written.</li>")
    total = len(b["residents"])
    title = f"Delivered report - {b.get('ma') or b.get('folder_name') or 'Round'} - {b.get('date', '')}"
    page = f"""<!doctype html><html><head><meta charset="utf-8"><title>{esc(title)}</title><style>
body{{font:15px/1.5 Aptos,Segoe UI,sans-serif;color:#1d2a33;max-width:1000px;margin:32px auto;padding:0 20px}}
h1{{font-size:22px;margin:0 0 4px}} p.sub{{color:#5b6b75;margin:0 0 20px}}
table{{border-collapse:collapse;width:100%}} th,td{{text-align:left;padding:8px 10px;border-bottom:1px solid #dfe5e8;vertical-align:top}}
th{{font-size:13px;color:#5b6b75;font-weight:600}} td.why{{color:#8a2d1f;font-size:13px;max-width:380px}}
.band{{padding:1px 8px;border-radius:10px;font-size:13px}} .gold{{background:#f3e3a6}} .green{{background:#cfe9d4}}
.amber{{background:#f8d9a8}} .red{{background:#f3c1b8}} tr.done td:nth-child(2){{color:#1f6b3a;font-weight:600}}
a{{color:#1b5e8c}} ul{{padding-left:20px}}</style></head><body>
<h1>{esc(title)}</h1>
<p class="sub">{done} of {total} delivered{f", {failed} not finished" if failed else ""}. Updated {dt.datetime.now():%d/%m/%Y %H:%M}.</p>
<table><tr><th>Resident</th><th>Result</th><th>Band</th><th>Score</th><th>Form</th><th>Why not finished</th></tr>
{''.join(rows)}</table>{"<h2 style='font-size:17px;margin-top:28px'>Round documents</h2><ul>" + "".join(extras) + "</ul>" if extras else ""}
</body></html>"""
    path = report_path(b)
    path.write_text(page, encoding="utf-8")
    return path


def report_path(b: dict) -> Path:
    return out_dir(b) / f"Delivered report - {safe_name(b.get('ma') or b.get('folder_name') or 'Round')}.html"


def out_dir(b: dict) -> Path:
    """Where the finished forms go: a 'Completed Audits' folder inside the folder that was
    dropped in, or, for uploads, the save folder in settings under the managing agent."""
    if b.get("source") and Path(b["source"]).is_dir():
        return Path(b["source"]) / "Completed Audits"
    base = Path(settings()["output_dir"]).expanduser()
    name = b.get("ma") or b.get("folder_name")
    return base / safe_name(name) if name else base


def _unique(p: Path, overwrite: bool = False) -> Path:
    if overwrite or not p.exists():
        return p
    n = 2
    while True:
        q = p.with_name(f"{p.stem} ({n}){p.suffix}")
        if not q.exists():
            return q
        n += 1


def _reid_obj(obj, display):
    if isinstance(obj, str):
        return reid_text(obj, display)
    if isinstance(obj, list):
        return [_reid_obj(x, display) for x in obj]
    if isinstance(obj, dict):
        return {k: _reid_obj(v, display) for k, v in obj.items()}
    return obj


def build_scorebook(bid: str) -> Path | None:
    """Rebuild the round's scoring workbook from every resident scored so far."""
    import scorebook
    b = load(bid)
    done = [(n, r) for n, r in b["residents"].items() if r.get("score")]
    if not done:
        return None
    tabs = scorebook.tab_names([n for n, _ in done])
    rows = [{"name": n, "score": r["score"], "tab": t} for (n, r), t in zip(done, tabs)]
    path = out_dir(b) / f"Audit Scores - {safe_name(b['ma'] or 'Round')}.xlsx"
    try:
        scorebook.build(path, b["ma"], b["date"], rows)
    except PermissionError:  # open in Excel: save beside it instead
        path = _unique(path.with_name(path.stem + " (updated).xlsx"), overwrite=True)
        scorebook.build(path, b["ma"], b["date"], rows)
    b = load(bid)
    b["scorebook"] = str(path)
    save(b)
    return path


def round_ready_for_feedback(b: dict) -> bool:
    rs = b["residents"].values()
    return (feedback_template_path() is not None and any(r["status"] == "done" for r in rs)
            and not any(r["status"] in ("queued", "running", "stopping") for r in rs)
            and _feedback_due(b))


def _feedback_due(b: dict) -> bool:
    """Every round gets an Overall Feedback Form. It is written once the residents are finished,
    tried again if it failed, and rewritten if a resident was re-audited after it was written.
    Only a form you stopped yourself is left alone."""
    fb = b.get("feedback") or {}
    st = fb.get("status")
    if st in (None, "waiting", "failed"):
        return True
    if st == "done":
        last = max((r.get("finished") or "" for r in b["residents"].values() if r["status"] == "done"), default="")
        return bool(fb.get("finished")) and last > fb["finished"]
    return False


def run_feedback(bid: str, on_run=None) -> dict:
    """Claude writes the Overall Feedback Form from the redacted round and the finished
    (redacted) Form As and scores; then the real details go back in, on this computer."""
    b = load(bid)
    d = bdir(bid)
    fb = b.setdefault("feedback", {})
    t = feedback_template_path()
    if not t:
        fb.update(status="failed", error="No Overall Feedback Form in the template folder")
        save(b)
        return fb
    work = d / "claude" / "work" / "_round"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    redacted_out = work / "Overall Feedback Form.docx"
    labels = ", ".join(r["label"] for r in b["residents"].values() if r["status"] == "done")
    job = {
        "instructions": "FEEDBACK.md", "label": "round", "round": str(d / "claude" / "round"),
        "audits": str(d / "claude" / "work"), "template": str(t), "reference": str(REFERENCE_RED),
        "work": str(work), "output": str(redacted_out), "ma": b["ma"], "date": b["date"],
        "follow_up": b["follow_up"], "notes": reid_free(b["notes"], d),
        "extra_dirs": [str(d / "claude" / "work")],
        "prompt": (f"Write the Overall Feedback Form for this round ({labels}) from the blank form at {t}, "
                   f"following CLAUDE.md. Save it as {redacted_out}."),
        "private_dirs": [str(d / "private"), str(REFERENCE), str(HOME / "private_reference"),
                         settings()["output_dir"], str(out_dir(b))],
    }
    fb.update(status="running", started=dt.datetime.now().isoformat(timespec="seconds"))
    fb.pop("error", None)
    save(b)
    run = runner.Run(job, settings(), lambda line: log(bid, "_round", line))
    if on_run:
        on_run(run)
    try:
        ok = run.start()
    except Exception as e:
        log(bid, "_round", f"! {type(e).__name__}: {e}")
        run.error = run.error or f"The app hit an error: {type(e).__name__}: {e}"
        ok = False
    b = load(bid)
    fb = b["feedback"]
    if fb.get("status") == "stopping":
        fb["status"] = "stopped"
        fb["error"] = "You stopped the feedback form."
        save(b)
        return fb
    if not ok:
        fb["status"] = "failed"
        fb["error"] = _readable(bid, run.error or "Claude stopped without saving the feedback form.")
        save(b)
        return fb
    final = _unique(out_dir(b) / f"Overall Feedback Form - {safe_name(b['ma'] or 'Round')}.docx")
    try:
        # screenshots may come from the round's own crops or be reused from a resident's audit
        info = reidentify(redacted_out, final, d / "private", d / "claude" / "work", d / "claude" / "round")
    except Exception as e:
        log(bid, "_round", f"! Putting the real details back failed: {type(e).__name__}: {e}")
        fb["status"] = "failed"
        fb["error"] = f"The form was made, but putting the real names back failed: {type(e).__name__}: {e}"
        save(b)
        return fb
    display = json.loads((d / "private" / "key.json").read_text(encoding="utf-8"))["display"]
    fb.update(status="done", final=str(final), restore=info, result=reid_text(run.result_text, display),
              finished=dt.datetime.now().isoformat(timespec="seconds"))
    log(bid, "_round", f"Real details put back on this computer. Saved: {final}")
    save(b)
    return fb


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
