"""Support Audit as a private web page, for the always-on server.

    SA_HOME=/srv/supportaudit python server.py          # listens on 127.0.0.1:8765

It only listens on the server itself. Tailscale publishes it to your own devices
(`tailscale serve --bg 8765`), so nobody outside your tailnet can reach it. Set
SA_PASSWORD as well if you want a password on top.

Audits run one at a time in the order they were added. Each job keeps its own folder:
    SA_HOME/jobs/<id>/resident/   the uploaded files
    SA_HOME/jobs/<id>/job.json    details, status and result
    SA_HOME/jobs/<id>/log.txt     what Claude did
    SA_HOME/jobs/<id>/work/       copies made while working
Delete a job from the page once the round is closed and its files are gone from the server.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import queue
import re
import secrets
import shutil
import threading
import uuid
import zipfile
from pathlib import Path

import uvicorn
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

import runner

HOME = runner.HOME
JOBS = HOME / "jobs"
TEMPLATE_DIR = HOME / "template"
REFERENCE = HOME / "reference"
PASSWORD = os.environ.get("SA_PASSWORD", "")
PORT = int(os.environ.get("SA_PORT", "8765"))

for d in (JOBS, TEMPLATE_DIR, REFERENCE):
    d.mkdir(parents=True, exist_ok=True)
try:
    os.chmod(HOME, 0o700)  # owner-only: resident files never readable by other users
except OSError:
    pass

security = HTTPBasic(auto_error=False)


def check_password(creds: HTTPBasicCredentials | None = Depends(security)):
    if not PASSWORD:
        return
    if not creds or not secrets.compare_digest(creds.password.encode(), PASSWORD.encode()):
        raise HTTPException(401, "Password needed", headers={"WWW-Authenticate": "Basic"})


app = FastAPI(dependencies=[Depends(check_password)], docs_url=None, redoc_url=None)
work_queue: "queue.Queue[str]" = queue.Queue()
current: dict = {"id": None, "run": None}
lock = threading.Lock()


# ---------- helpers ----------

def safe_part(p: str) -> str:
    p = re.sub(r'[<>:"|?*\x00-\x1f]', "_", p).strip().strip(".")
    return p or "_"


def safe_rel(name: str) -> Path:
    parts = [safe_part(x) for x in re.split(r"[\\/]+", name or "") if x not in ("", ".", "..")]
    if not parts:
        raise HTTPException(400, "Empty file name")
    return Path(*parts)


def template_path() -> Path | None:
    files = sorted(TEMPLATE_DIR.glob("*.docx"))
    return files[0] if files else None


def job_dir(jid: str) -> Path:
    if not re.fullmatch(r"[a-f0-9]{12}", jid):
        raise HTTPException(404, "No such job")
    d = JOBS / jid
    if not d.exists():
        raise HTTPException(404, "No such job")
    return d


def read_job(jid: str) -> dict:
    return json.loads((job_dir(jid) / "job.json").read_text(encoding="utf-8"))


def write_job(job: dict):
    path = JOBS / job["id"] / "job.json"
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(job, indent=2), encoding="utf-8")
    tmp.replace(path)


def log(jid: str, line: str):
    with open(JOBS / jid / "log.txt", "a", encoding="utf-8") as f:
        f.write(line.rstrip("\n") + "\n")


def settings() -> dict:
    s = runner.load_settings()
    t = template_path()
    s["template"] = str(t) if t else ""
    s["reference"] = str(REFERENCE)
    return s


# ---------- the worker: one audit at a time ----------

def worker():
    while True:
        jid = work_queue.get()
        try:
            job = read_job(jid)
        except Exception:
            continue
        if job["status"] != "queued":
            continue
        job["status"], job["started"] = "running", dt.datetime.now().isoformat(timespec="seconds")
        write_job(job)
        s = settings()
        rj = runner.make_job(job["resident_dir"], s, job["ma"], job["date"], job["follow_up"], job["notes"],
                             work_root=JOBS / jid / "work")
        job["output"], job["work"] = rj["output"], rj["work"]
        write_job(job)
        run = runner.Run(rj, s, lambda line, j=jid: log(j, line))
        with lock:
            current.update(id=jid, run=run)
        try:
            ok = run.start()
        except Exception as e:  # never let one job stop the worker
            log(jid, f"! {type(e).__name__}: {e}")
            ok = False
        with lock:
            current.update(id=None, run=None)
        job = read_job(jid)
        if job["status"] == "stopping":
            job["status"] = "stopped"
        else:
            job["status"] = "done" if ok else "failed"
        job["result"] = run.result_text
        m = re.search(r"Rating:\W*(Gold|Green|Amber|Red)", run.result_text or "", re.I)
        job["rating"] = m.group(1).title() if m else None
        job["finished"] = dt.datetime.now().isoformat(timespec="seconds")
        write_job(job)


def recover():
    """After a restart: requeue waiting jobs, mark interrupted ones."""
    for jf in sorted(JOBS.glob("*/job.json"), key=lambda p: p.stat().st_mtime):
        job = json.loads(jf.read_text(encoding="utf-8"))
        if job["status"] in ("running", "stopping"):
            job["status"] = "failed"
            job["result"] = "The server restarted while this audit was running. Press Retry."
            write_job(job)
        elif job["status"] == "queued":
            work_queue.put(job["id"])


# ---------- API ----------

@app.get("/", response_class=HTMLResponse)
def page():
    return (Path(__file__).parent / "web" / "index.html").read_text(encoding="utf-8")


_login_cache: dict = {"at": 0.0, "value": None}


def cached_login() -> dict:
    import time
    if time.time() - _login_cache["at"] > 60 or _login_cache["value"] is None:
        claude = runner.find_claude(runner.load_settings().get("claude_path", ""))
        _login_cache.update(at=time.time(), value=runner.login_status(claude))
    return _login_cache["value"]


@app.get("/api/state")
def state():
    t = template_path()
    jobs = []
    for jf in JOBS.glob("*/job.json"):
        j = json.loads(jf.read_text(encoding="utf-8"))
        jobs.append({k: j.get(k) for k in ("id", "name", "status", "created", "finished", "rating")}
                    | {"has_output": bool(j.get("output")) and Path(j["output"]).exists()})
    jobs.sort(key=lambda j: j["created"], reverse=True)
    return {
        "template": t.name if t else None,
        "reference": sorted(p.name for p in REFERENCE.iterdir() if p.is_file()),
        "login": cached_login(),
        "jobs": jobs,
    }


@app.post("/api/template")
async def upload_template(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(400, "The blank form must be a .docx file")
    for old in TEMPLATE_DIR.glob("*.docx"):
        old.unlink()
    dest = TEMPLATE_DIR / safe_part(Path(file.filename).name)
    dest.write_bytes(await file.read())
    return {"template": dest.name}


@app.post("/api/reference")
async def upload_reference(files: list[UploadFile] = File(...)):
    saved = []
    for f in files:
        dest = REFERENCE / safe_part(Path(f.filename.replace("\\", "/")).name)
        dest.write_bytes(await f.read())
        saved.append(dest.name)
    return {"saved": saved}


@app.delete("/api/reference/{name}")
def delete_reference(name: str):
    p = REFERENCE / safe_part(name)
    if p.exists() and p.parent == REFERENCE:
        p.unlink()
    return {"ok": True}


def _new_job(name: str, ma: str, date: str, follow_up: bool, notes: str) -> dict:
    jid = uuid.uuid4().hex[:12]
    d = JOBS / jid
    (d / "resident").mkdir(parents=True)
    return {"id": jid, "name": name, "status": "uploading", "created": dt.datetime.now().isoformat(timespec="seconds"),
            "ma": ma, "date": date or dt.date.today().strftime("%d/%m/%y"), "follow_up": follow_up,
            "notes": notes, "resident_dir": str(d / "resident" / safe_part(name))}


@app.post("/api/jobs")
async def create_jobs(files: list[UploadFile] = File(...), ma: str = Form(""), date: str = Form(""),
                      follow_up: bool = Form(False), notes: str = Form(""), several: bool = Form(False)):
    """Files arrive with their path inside the dropped folder as the file name, e.g.
    'Sam Sample/WR-11.pdf'. A single .zip is unpacked. With several=True the dropped
    folder holds one sub-folder per resident and each becomes its own audit."""
    if not template_path():
        raise HTTPException(400, "Upload the blank form first (step 1).")
    staged = JOBS / f"_upload_{uuid.uuid4().hex[:8]}"
    staged.mkdir()
    try:
        for f in files:
            rel = safe_rel(f.filename)
            dest = staged / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(await f.read())
        zips = list(staged.rglob("*.zip"))
        if len(zips) == 1 and sum(1 for p in staged.rglob("*") if p.is_file()) == 1:
            with zipfile.ZipFile(zips[0]) as z:
                for info in z.infolist():
                    if info.is_dir() or info.filename.startswith("__MACOSX"):
                        continue
                    dest = staged / zips[0].stem / safe_rel(info.filename)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(z.read(info))
            zips[0].unlink()
            inner = staged / zips[0].stem
            tops = [p for p in inner.iterdir()]
            if len(tops) == 1 and tops[0].is_dir():  # zip of a folder
                shutil.move(str(tops[0]), str(staged / tops[0].name))
                shutil.rmtree(inner)
        tops = [p for p in staged.iterdir() if not p.name.startswith(".")]
        if len(tops) == 1 and tops[0].is_dir():
            root = tops[0]
        else:  # loose files: treat the upload itself as the resident folder
            root = staged / "Resident"
            root.mkdir(exist_ok=True)
            for p in tops:
                if p != root:
                    shutil.move(str(p), str(root / p.name))
        groups = ([p for p in sorted(root.iterdir()) if p.is_dir() and not p.name.startswith(".")]
                  if several else [root])
        if not groups:
            raise HTTPException(400, "No resident folders found inside that folder.")
        created = []
        for g in groups:
            job = _new_job(g.name, ma.strip(), date.strip(), follow_up, notes.strip())
            shutil.move(str(g), job["resident_dir"])
            job["status"] = "queued"
            write_job(job)
            log(job["id"], f"Queued {g.name} ({sum(1 for p in Path(job['resident_dir']).rglob('*') if p.is_file())} files)")
            work_queue.put(job["id"])
            created.append(job["id"])
        return {"created": created}
    finally:
        shutil.rmtree(staged, ignore_errors=True)


@app.get("/api/jobs/{jid}")
def job_detail(jid: str, offset: int = 0):
    job = read_job(jid)
    lines = (job_dir(jid) / "log.txt").read_text(encoding="utf-8").splitlines()
    out = job.get("output")
    return {"job": {k: v for k, v in job.items() if k not in ("resident_dir", "work", "output")}
            | {"has_output": bool(out) and Path(out).exists(),
               "output_name": Path(out).name if out else None},
            "lines": lines[offset:], "next": len(lines)}


@app.get("/api/jobs/{jid}/download")
def download(jid: str):
    job = read_job(jid)
    out = job.get("output")
    if not out or not Path(out).exists():
        raise HTTPException(404, "No finished form for this job yet")
    return FileResponse(out, filename=Path(out).name,
                        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")


@app.post("/api/jobs/{jid}/stop")
def stop(jid: str):
    job = read_job(jid)
    if job["status"] == "queued":
        job["status"] = "stopped"
        write_job(job)
    elif job["status"] == "running":
        job["status"] = "stopping"
        write_job(job)
        with lock:
            if current["id"] == jid and current["run"]:
                current["run"].stop()
    return {"ok": True}


@app.post("/api/jobs/{jid}/retry")
def retry(jid: str):
    job = read_job(jid)
    if job["status"] in ("running", "queued", "stopping"):
        raise HTTPException(400, "Already running or waiting")
    if job.get("output") and Path(job["output"]).exists():
        Path(job["output"]).unlink()  # a retry replaces the form rather than adding a copy
    job["status"] = "queued"
    job["result"] = ""
    write_job(job)
    log(jid, "\n--- Retry ---")
    work_queue.put(jid)
    return {"ok": True}


@app.delete("/api/jobs/{jid}")
def delete_job(jid: str):
    job = read_job(jid)
    if job["status"] in ("running", "stopping"):
        raise HTTPException(400, "Stop it first")
    shutil.rmtree(job_dir(jid), ignore_errors=True)
    return {"ok": True}


def main():
    recover()
    threading.Thread(target=worker, daemon=True).start()
    uvicorn.run(app, host=os.environ.get("SA_BIND", "127.0.0.1"), port=PORT, log_level="warning")


if __name__ == "__main__":
    main()
