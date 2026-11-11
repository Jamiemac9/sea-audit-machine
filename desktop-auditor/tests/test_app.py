"""Whole app on invented data: upload a round, check it, send it, get real forms back.
    python tests/test_app.py"""
import json, os, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / "tests")]
from test_privacy import build, SECRETS
from test_tools import make_form
from docx import Document

PORT = 8797
BASE = f"http://127.0.0.1:{PORT}"


def call(path, data=None, method=None, files=None):
    if files is not None:
        import uuid
        bd = uuid.uuid4().hex; body = b""
        for k, v in (data or {}).items():
            body += f'--{bd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
        for name, (fn, content) in files:
            body += f'--{bd}\r\nContent-Disposition: form-data; name="{name}"; filename="{fn}"\r\n\r\n'.encode() + content + b"\r\n"
        body += f"--{bd}--\r\n".encode()
        req = urllib.request.Request(BASE + path, body, {"Content-Type": f"multipart/form-data; boundary={bd}"})
    elif data is not None:
        req = urllib.request.Request(BASE + path, json.dumps(data).encode(), {"Content-Type": "application/json"}, method=method or "POST")
    else:
        req = urllib.request.Request(BASE + path, method=method or "GET")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def wait(cond, secs=180):
    end = time.time() + secs
    while time.time() < end:
        v = cond()
        if v:
            return v
        time.sleep(1)
    raise TimeoutError


def main():
    tmp = Path(tempfile.mkdtemp(prefix="app-"))
    home = tmp / "SupportAudit"; home.mkdir()
    out_dir = tmp / "Finished"
    (home / "settings.json").write_text(json.dumps({"claude_path": str(ROOT / "tests" / "fake_claude.py"),
                                                    "output_dir": str(out_dir)}))
    env = dict(os.environ, SA_HOME=str(home), SA_PORT=str(PORT), FAKE_SECRETS=json.dumps(SECRETS))
    srv = subprocess.Popen([sys.executable, "server.py"], cwd=ROOT, env=env, stdout=open(tmp / "server.log", "w"), stderr=subprocess.STDOUT)
    try:
        wait(lambda: _up(), 30)
        form = tmp / "Support_Audit_OG.docx"; make_form(form)
        call("/api/template", files=[("file", ("Support_Audit_OG.docx", form.read_bytes()))], data={})
        # a completed audit as reference, naming a past resident
        ref = tmp / "Completed Audit.docx"; d = Document(); d.add_paragraph("Support Audit for Grace Oldfield. Rating: Green."); d.save(ref)
        call("/api/reference", files=[("files", ("Completed Audit.docx", ref.read_bytes()))], data={})
        dirs = build(tmp / "Example Property")
        files = []
        for name, folder in dirs.items():
            for p in folder.rglob("*"):
                if p.is_file():
                    files.append(("files", (f"Example Property/{name}/{p.relative_to(folder).as_posix()}", p.read_bytes())))
        bid = call("/api/batches", files=files, data={"ma": "Example Agent Ltd", "several": "true",
                                                      "notes": "Sam Sample moved rooms in August"})["id"]
        b = wait(lambda: (lambda b: b if b["status"] in ("check", "blocked", "failed") else None)(call(f"/api/batches/{bid}")))
        assert b["status"] == "check", b
        print("Ready to check:", b["report"]["counts"], "held back:", b["report"]["held_back"])
        assert any(f["path"].startswith("RESIDENT_A/") for f in b["preview"])
        wait(lambda: any((home / "reference_redacted").iterdir()), 60)
        os.environ["FAKE_SECRETS"] = json.dumps(SECRETS)
        call(f"/api/batches/{bid}/approve", data={})
        b = wait(lambda: (lambda b: b if all(r["status"] in ("done", "failed") for r in b["residents"].values()) else None)(call(f"/api/batches/{bid}")), 300)
        for name, r in b["residents"].items():
            lines = call(f"/api/batches/{bid}/log?label={r['label'].strip('[]')}")["lines"]
            print(f"--- {name} ({r['label']}): {r['status']} {r.get('rating')}\n   " + "\n   ".join(lines[-4:]))
            assert r["status"] == "done", r
        r = b["residents"]["Sam Sample"]
        assert "Jordan Patel" in r["result"] and "Tina Test" in r["result"] and "[" not in r["result"], r["result"]
        final = out_dir / "Example Agent Ltd" / "Support Audit - Sam Sample.docx"
        text = "\n".join(c.text for t in Document(str(final)).tables for row in t.rows for c in row.cells)
        assert "Sam Sample" in text and "Jordan Patel supported Sam Sample" in text, text
        assert r["restore"]["screenshots_restored"] == 1, r["restore"]
        print("Finished form:", final, "\nResult shown:", r["result"])
        call(f"/api/batches/{bid}", method="DELETE")
        assert not (home / "batches" / bid).exists() and final.exists()
        print("All app checks passed.")
    finally:
        srv.terminate()


def _up():
    try:
        call("/api/state"); return True
    except Exception:
        return False


if __name__ == "__main__":
    main()
