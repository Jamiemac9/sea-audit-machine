"""Support Audit: the page you use, served by this computer to this computer only.

    python server.py            # then open http://127.0.0.1:8765 (the launcher does both)

It listens on 127.0.0.1, so nothing else on the network can reach it. (For a server later:
the same app runs behind Tailscale, see deploy/.)

Work happens in one queue, in order: redact a round (on this computer), wait for you to
check it, audit each resident with Claude, put the real details back (on this computer).
"""
from __future__ import annotations

import os as _os
import sys as _sys
from pathlib import Path as _Path

# Started with no console (pythonw on Windows, a login item on a Mac): there is nowhere to
# print, and the web server refuses to start without somewhere to write. Use a log file.
if _sys.stdout is None or _sys.stderr is None:
    _home = _Path(_os.environ.get("SA_HOME") or (_Path.home() / "SupportAudit")).expanduser()
    _home.mkdir(parents=True, exist_ok=True)
    _log = open(_home / "server.log", "a", encoding="utf-8", buffering=1)
    _sys.stdout = _sys.stdout or _log
    _sys.stderr = _sys.stderr or _log

import json
import os
import platform
import queue
import re
import secrets
import shutil
import subprocess
import threading
import time
import uuid
import zipfile
from pathlib import Path

import pymupdf as fitz
import uvicorn
from fastapi import Body, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.security import HTTPBasic, HTTPBasicCredentials

import pipeline as pl
import runner

PASSWORD = os.environ.get("SA_PASSWORD", "")
PORT = int(os.environ.get("SA_PORT", "8765"))
LOCAL = os.environ.get("SA_BIND", "127.0.0.1") in ("127.0.0.1", "localhost")
try:
    os.chmod(pl.HOME, 0o700)  # owner-only
except OSError:
    pass

security = HTTPBasic(auto_error=False)


def check_password(creds: HTTPBasicCredentials | None = Depends(security)):
    if not PASSWORD:
        return
    if not creds or not secrets.compare_digest(creds.password.encode(), PASSWORD.encode()):
        raise HTTPException(401, "Password needed", headers={"WWW-Authenticate": "Basic"})


app = FastAPI(dependencies=[Depends(check_password)], docs_url=None, redoc_url=None)
tasks: "queue.Queue[tuple]" = queue.Queue()
current = {"run": None, "where": None}
lock = threading.Lock()


# ---------- the one queue ----------

def worker():
    while True:
        kind, bid, name = tasks.get()
        try:
            if kind == "redact":
                b = pl.redact(bid)
                pl.log(bid, "", f"Redacted on this computer: {(b.get('report') or {}).get('counts')}")
                if not pl.settings()["check_before_sending"] and b["status"] == "check":
                    for n in pl.approve(bid):
                        tasks.put(("audit", bid, n))
            elif kind == "audit":
                b = pl.load(bid)
                if b["residents"][name]["status"] != "queued":
                    continue
                with lock:
                    current["where"] = (bid, name)
                pl.run_resident(bid, name, on_run=lambda r: current.update(run=r))
            elif kind == "reference":
                pl.refresh_reference()
        except KeyError:
            pass  # deleted while waiting
        except Exception as e:
            try:
                pl.log(bid, "", f"! {type(e).__name__}: {e}")
            except Exception:
                pass
        finally:
            with lock:
                current.update(run=None, where=None)


def recover():
    for bf in sorted(pl.BATCHES.glob("*/batch.json"), key=lambda p: p.stat().st_mtime):
        b = json.loads(bf.read_text(encoding="utf-8"))
        changed = False
        if b["status"] == "redacting":
            tasks.put(("redact", b["id"], None))
        for name, r in b["residents"].items():
            if r["status"] in ("running", "stopping"):
                r["status"] = "failed"
                changed = True
            elif r["status"] == "queued":
                tasks.put(("audit", b["id"], name))
        if changed:
            pl.save(b)


# ---------- helpers ----------

def safe_part(p: str) -> str:
    return re.sub(r'[<>:"|?*\x00-\x1f]', "_", p).strip().strip(".") or "_"


def safe_rel(name: str) -> Path:
    parts = [safe_part(x) for x in re.split(r"[\\/]+", name or "") if x not in ("", ".", "..")]
    if not parts:
        raise HTTPException(400, "Empty file name")
    return Path(*parts)


def get_batch(bid):
    try:
        return pl.load(bid)
    except (KeyError, FileNotFoundError):
        raise HTTPException(404, "No such round")


_login = {"at": 0.0, "value": None}


def login():
    stale = 60 if (_login["value"] or {}).get("loggedIn") else 10
    if time.time() - _login["at"] > stale or _login["value"] is None:
        claude = runner.find_claude(pl.settings().get("claude_path", ""))
        _login.update(at=time.time(), value=runner.login_status(claude))
    return _login["value"]


# ---------- page and settings ----------

@app.get("/", response_class=HTMLResponse)
def page():
    return (Path(__file__).parent / "web" / "index.html").read_text(encoding="utf-8")


_ref_sig = {"value": None}


def reference_changed() -> bool:
    """Files can be dropped straight into the reference folder: notice and re-redact."""
    sig = sorted((p.name, p.stat().st_size, int(p.stat().st_mtime)) for p in pl.REFERENCE.iterdir() if p.is_file())
    if sig != _ref_sig["value"]:
        first = _ref_sig["value"] is None
        _ref_sig["value"] = sig
        return not first or (bool(sig) and not any(pl.REFERENCE_RED.iterdir()))
    return False


@app.get("/api/state")
def state():
    from privacy import redact as R
    if reference_changed():
        tasks.put(("reference", None, None))
    s = pl.settings()
    t = pl.template_path()
    ref_report = pl.HOME / "private_reference" / "reference-redaction-report.json"
    ref = json.loads(ref_report.read_text()) if ref_report.exists() else {"leaks": [], "files": []}
    batches = []
    for bf in pl.BATCHES.glob("*/batch.json"):
        b = json.loads(bf.read_text(encoding="utf-8"))
        batches.append({"id": b["id"], "created": b["created"], "status": b["status"], "ma": b["ma"],
                        "residents": [{"name": n, "label": r.get("label"), "status": r["status"],
                                       "rating": r.get("rating")} for n, r in b["residents"].items()]})
    batches.sort(key=lambda b: b["created"], reverse=True)
    return {
        "template": t.name if t else None,
        "template_others": [p.name for p in pl.template_files() if not t or p != t],
        "reference": sorted(p.name for p in pl.REFERENCE.iterdir() if p.is_file()),
        "reference_held_back": [f["file"] for f in ref["files"] if f.get("status") == "held back"],
        "reference_leaks": len(ref["leaks"]),
        "login": login(),
        "settings": {k: s[k] for k in ("hide_names", "output_dir", "check_before_sending")},
        "tools": {"name_finder": R._NLP is not None, "ocr": R._OCR, "office": bool(R.soffice())},
        "local": LOCAL,
        "inbox": [{"name": p.name, "files": sum(1 for f in p.rglob("*") if f.is_file())}
                  for p in sorted(pl.INBOX.iterdir()) if p.is_dir()],
        "folders": {"template": str(pl.TEMPLATE_DIR), "reference": str(pl.REFERENCE), "inbox": str(pl.INBOX)},
        "batches": batches,
    }


@app.post("/api/settings")
def set_settings(body: dict = Body(...)):
    s = runner.load_settings()
    if "hide_names" in body:
        s["hide_names"] = [n.strip() for n in body["hide_names"] if n.strip()]
        tasks.put(("reference", None, None))
    if "output_dir" in body:
        s["output_dir"] = body["output_dir"].strip() or str(pl.DEFAULT_OUT)
    if "check_before_sending" in body:
        s["check_before_sending"] = bool(body["check_before_sending"])
    runner.save_settings(s)
    return {"ok": True}


@app.post("/api/login")
def claude_login():
    """Open a terminal window on this computer that signs Claude Code in (a browser page opens)."""
    if not LOCAL:
        raise HTTPException(400, "Only on this computer")
    claude = runner.find_claude(pl.settings().get("claude_path", ""))
    if not claude:
        raise HTTPException(400, "Claude Code is not installed. Run the installer again.")
    if platform.system() == "Windows":
        subprocess.Popen(["cmd", "/c", "start", "Claude login", "cmd", "/k", claude, "auth", "login"])
    elif platform.system() == "Darwin":
        subprocess.run(["osascript", "-e", f'tell application "Terminal" to do script "\\"{claude}\\" auth login"',
                        "-e", 'tell application "Terminal" to activate'])
    else:
        raise HTTPException(400, "Run: claude auth login")
    _login["at"] = 0.0  # check again soon
    return {"ok": True}


@app.post("/api/template")
async def upload_template(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(400, "The blank form must be a .docx file")
    for old in pl.TEMPLATE_DIR.glob("*.docx"):
        old.unlink()
    dest = pl.TEMPLATE_DIR / safe_part(Path(file.filename).name)
    dest.write_bytes(await file.read())
    return {"template": dest.name}


@app.post("/api/reference")
async def upload_reference(files: list[UploadFile] = File(...)):
    for f in files:
        (pl.REFERENCE / safe_part(Path(f.filename.replace("\\", "/")).name)).write_bytes(await f.read())
    tasks.put(("reference", None, None))
    return {"ok": True}


@app.delete("/api/reference/{name}")
def delete_reference(name: str):
    p = pl.REFERENCE / safe_part(name)
    if p.exists():
        p.unlink()
    tasks.put(("reference", None, None))
    return {"ok": True}


# ---------- rounds ----------

def _batch_from_root(root: Path, several: bool, ma: str, date: str, follow_up: bool, notes: str,
                     extra_names: str) -> dict:
    groups = ([p for p in sorted(root.iterdir()) if p.is_dir() and not p.name.startswith(".")]
              if several else [root])
    if not groups:
        raise HTTPException(400, "No resident folders found inside that folder.")
    if not any(f.is_file() for g in groups for f in g.rglob("*")):
        raise HTTPException(400, "That folder has no files in it.")
    names = [n.strip() for n in re.split(r"[\n,;]+", extra_names) if n.strip()]
    b = pl.new_batch(groups, ma.strip(), date.strip(), follow_up, notes.strip(), names)
    pl.log(b["id"], "", f"Added {len(groups)} resident file(s). Redacting on this computer...")
    tasks.put(("redact", b["id"], None))
    return {"id": b["id"]}


@app.post("/api/batches")
async def create_batch(files: list[UploadFile] = File(...), ma: str = Form(""), date: str = Form(""),
                       follow_up: bool = Form(False), notes: str = Form(""), several: bool = Form(False),
                       extra_names: str = Form(""), folder_name: str = Form("")):
    if not pl.template_path():
        raise HTTPException(400, "Put the blank form in the template folder first (step 1).")
    staged = pl.HOME / f"_upload_{uuid.uuid4().hex[:8]}"
    staged.mkdir()
    try:
        for f in files:
            rel = safe_rel(f.filename)
            if folder_name and len(rel.parts) == 1:  # loose files chosen one by one
                rel = Path(safe_part(folder_name)) / rel
            dest = staged / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(await f.read())
        files_now = [p for p in staged.rglob("*") if p.is_file()]
        if len(files_now) == 1 and files_now[0].suffix.lower() == ".zip":
            z = files_now[0]
            with zipfile.ZipFile(z) as zf:
                for info in zf.infolist():
                    if info.is_dir() or info.filename.startswith("__MACOSX"):
                        continue
                    dest = staged / z.stem / safe_rel(info.filename)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(zf.read(info))
            z.unlink()
            inner = staged / z.stem
            kids = list(inner.iterdir())
            if len(kids) == 1 and kids[0].is_dir():
                shutil.move(str(kids[0]), str(staged / kids[0].name))
                shutil.rmtree(inner)
        tops = [p for p in staged.iterdir() if not p.name.startswith(".")]
        if len(tops) == 1 and tops[0].is_dir():
            root = tops[0]
        else:
            root = staged / "Resident"
            root.mkdir(exist_ok=True)
            for p in tops:
                if p != root:
                    shutil.move(str(p), str(root / p.name))
        return _batch_from_root(root, several, ma, date, follow_up, notes, extra_names)
    finally:
        shutil.rmtree(staged, ignore_errors=True)


@app.post("/api/batches/from-folder")
def create_batch_from_folder(body: dict = Body(...)):
    """Use a folder already on this computer (pasted location, or one in the inbox).
    The folder is copied; the original is left exactly as it is."""
    if not LOCAL:
        raise HTTPException(400, "Only on this computer")
    if not pl.template_path():
        raise HTTPException(400, "Put the blank form in the template folder first (step 1).")
    raw = (body.get("path") or "").strip().strip('"').strip("'")
    if body.get("inbox"):
        raw = str(pl.INBOX / safe_part(body["inbox"]))
    src = Path(os.path.expandvars(raw)).expanduser()
    if not raw or not src.is_dir():
        raise HTTPException(400, f"Can't find that folder: {raw or '(empty)'}. In File Explorer, open the "
                                 "resident's folder, click the address bar, copy it and paste it here.")
    staged = pl.HOME / f"_upload_{uuid.uuid4().hex[:8]}"
    try:
        shutil.copytree(src, staged / src.name, ignore=shutil.ignore_patterns(".*", "~$*", "desktop.ini", "Thumbs.db"))
        return _batch_from_root(staged / src.name, bool(body.get("several")), body.get("ma", ""),
                                body.get("date", ""), bool(body.get("follow_up")), body.get("notes", ""),
                                body.get("extra_names", ""))
    finally:
        shutil.rmtree(staged, ignore_errors=True)


@app.get("/api/batches/{bid}")
def batch_detail(bid: str):
    b = get_batch(bid)
    b["preview"] = pl.preview_files(bid) if b["status"] != "redacting" else []
    for r in b["residents"].values():
        r["final_name"] = Path(r["final"]).name if r.get("final") else None
        r["has_final"] = bool(r.get("final")) and Path(r["final"]).exists()
        r.pop("final", None)
    return b


@app.get("/api/batches/{bid}/preview")
def preview(bid: str, path: str, page: int = 1):
    """Exactly what Claude would see, rendered on this computer."""
    get_batch(bid)
    try:
        p = pl.preview_path(bid, path)
    except KeyError:
        raise HTTPException(404)
    if not p.exists():
        raise HTTPException(404)
    if p.suffix.lower() == ".pdf":
        doc = fitz.open(p)
        page = max(1, min(page, len(doc)))
        png = doc[page - 1].get_pixmap(dpi=90, annots=True).tobytes("png")
        return Response(png, media_type="image/png", headers={"X-Pages": str(len(doc))})
    if p.suffix.lower() == ".png":
        return FileResponse(p, media_type="image/png", headers={"X-Pages": "1"})
    return Response(p.read_text(encoding="utf-8", errors="ignore"), media_type="text/plain; charset=utf-8")


@app.post("/api/batches/{bid}/redo")
def redo(bid: str, body: dict = Body(...)):
    b = get_batch(bid)
    if any(r["status"] in ("running", "queued") for r in b["residents"].values()):
        raise HTTPException(400, "Wait for the audits in this round to finish or stop them first")
    add = [n.strip() for n in body.get("names", []) if n.strip()]
    b["extra_names"] = list(dict.fromkeys(b.get("extra_names", []) + add))
    b["status"] = "redacting"
    pl.save(b)
    if body.get("always"):
        s = runner.load_settings()
        s["hide_names"] = list(dict.fromkeys(s.get("hide_names", []) + add))
        runner.save_settings(s)
    tasks.put(("redact", bid, None))
    return {"ok": True}


@app.post("/api/batches/{bid}/approve")
def approve(bid: str):
    get_batch(bid)
    try:
        names = pl.approve(bid)
    except ValueError as e:
        raise HTTPException(400, str(e))
    for n in names:
        tasks.put(("audit", bid, n))
    return {"queued": len(names)}


@app.get("/api/batches/{bid}/log")
def batch_log(bid: str, label: str = "", offset: int = 0):
    get_batch(bid)
    lines = pl.read_log(bid, label.strip("[]"))
    return {"lines": lines[offset:], "next": len(lines)}


def _resident(b, label):
    for name, r in b["residents"].items():
        if (r.get("label") or "").strip("[]") == label.strip("[]"):
            return name, r
    raise HTTPException(404, "No such resident")


@app.get("/api/batches/{bid}/download/{label}")
def download(bid: str, label: str):
    name, r = _resident(get_batch(bid), label)
    if not r.get("final") or not Path(r["final"]).exists():
        raise HTTPException(404, "No finished form yet")
    return FileResponse(r["final"], filename=Path(r["final"]).name,
                        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")


@app.post("/api/batches/{bid}/open/{label}")
def open_local(bid: str, label: str, folder: bool = False):
    """Open the finished form (or show it in its folder) on this computer."""
    if not LOCAL:
        raise HTTPException(400, "Only on this computer")
    name, r = _resident(get_batch(bid), label)
    if not r.get("final"):
        raise HTTPException(404)
    target = Path(r["final"])
    if platform.system() == "Darwin":
        subprocess.run(["open", "-R", str(target)] if folder else ["open", str(target)])
    elif platform.system() == "Windows":
        if folder:
            subprocess.run(["explorer", "/select,", str(target)])
        else:
            os.startfile(str(target))  # type: ignore[attr-defined]
    else:
        subprocess.run(["xdg-open", str(target.parent if folder else target)])
    return {"ok": True}


@app.post("/api/batches/{bid}/stop/{label}")
def stop(bid: str, label: str):
    b = get_batch(bid)
    name, r = _resident(b, label)
    if r["status"] == "queued":
        r["status"] = "stopped"
        pl.save(b)
    elif r["status"] == "running":
        r["status"] = "stopping"
        pl.save(b)
        with lock:
            if current["where"] == (bid, name) and current["run"]:
                current["run"].stop()
    return {"ok": True}


@app.post("/api/batches/{bid}/retry/{label}")
def retry(bid: str, label: str):
    b = get_batch(bid)
    name, r = _resident(b, label)
    if r["status"] in ("running", "queued", "stopping"):
        raise HTTPException(400, "Already running or waiting")
    r["status"] = "queued"
    pl.save(b)
    pl.log(bid, label.strip("[]"), "\n--- Retry ---")
    tasks.put(("audit", bid, name))
    return {"ok": True}


@app.delete("/api/batches/{bid}")
def delete_batch(bid: str):
    b = get_batch(bid)
    if any(r["status"] in ("running", "stopping") for r in b["residents"].values()):
        raise HTTPException(400, "Stop the running audit first")
    for r in b["residents"].values():
        if r["status"] == "queued":
            r["status"] = "stopped"
    pl.save(b)
    pl.delete(bid)
    return {"ok": True}


def main():
    recover()
    threading.Thread(target=worker, daemon=True).start()
    reference_changed()
    tasks.put(("reference", None, None))
    uvicorn.run(app, host=os.environ.get("SA_BIND", "127.0.0.1"), port=PORT, log_level="warning")


if __name__ == "__main__":
    main()
