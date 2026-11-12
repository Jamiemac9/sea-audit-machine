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
                                                    "output_dir": str(out_dir), "flow": 2,
                                                    "check_before_sending": True}))
    env = dict(os.environ, SA_HOME=str(home), SA_PORT=str(PORT), FAKE_SECRETS=json.dumps(SECRETS))
    srv = subprocess.Popen([sys.executable, "server.py"], cwd=ROOT, env=env, stdout=open(tmp / "server.log", "w"), stderr=subprocess.STDOUT)
    try:
        wait(lambda: _up(), 30)
        form = tmp / "Support_Audit_OG.docx"; make_form(form)
        call("/api/template", files=[("file", ("Support_Audit_OG.docx", form.read_bytes()))], data={})
        make_form(home / "template" / "Overall Feedback Form OG.docx")   # dropped straight in
        # a completed audit as reference, naming a past resident
        ref = tmp / "Completed Audit.docx"; d = Document(); d.add_paragraph("Support Audit for Grace Oldfield. Rating: Green."); d.save(ref)
        call("/api/reference", files=[("files", ("Completed Audit.docx", ref.read_bytes()))], data={})
        prop = tmp / "Desktop" / "Example Property"
        dirs = build(prop)
        bid = call("/api/batches/from-folder", {"path": str(prop), "ma": "Example Agent Ltd", "several": "auto",
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
        completed = prop / "Completed Audits"
        final = completed / "Support Audit - Sam Sample.docx"
        text = "\n".join(c.text for t in Document(str(final)).tables for row in t.rows for c in row.cells)
        assert "Sam Sample" in text and "Jordan Patel supported Sam Sample" in text, text
        assert r["restore"]["screenshots_restored"] == 1, r["restore"]
        print("Finished form:", final, "\nResult shown:", r["result"])
        assert r["rating"] == "Green" and r["total"] == 63.3, (r["rating"], r["total"])
        # scoring workbook: the framework's tabs plus one breakdown tab per resident
        from openpyxl import load_workbook
        wb = load_workbook(completed / "Audit Scores - Example Agent Ltd.xlsx")
        print("Workbook tabs:", wb.sheetnames)
        assert wb.sheetnames[:3] == ["Audits", "Weights", "MA Summary"] and "Sam Sample" in wb.sheetnames
        assert wb["Audits"]["A2"].value in ("Sam Sample", "Tina Test") and wb["Audits"]["E2"].value.startswith("=IF(")
        assert "Jordan Patel" in str(wb["Sam Sample"]["E12"].value), wb["Sam Sample"]["E12"].value
        # the overall feedback form, after both residents
        b = wait(lambda: (lambda b: b if b["feedback"]["status"] in ("done", "failed") else None)(call(f"/api/batches/{bid}")), 120)
        print("Feedback:", b["feedback"]["status"], call(f"/api/batches/{bid}/log?label=_round")["lines"][-2:])
        assert b["feedback"]["status"] == "done", b["feedback"]
        off = completed / "Overall Feedback Form - Example Agent Ltd.docx"
        text = "\n".join(c.text for t in Document(str(off)).tables for row in t.rows for c in row.cells)
        assert "Sam Sample" in text and "Tina Test" in text and "Jordan Patel" in text and "[" not in text, text
        assert b["feedback"]["restore"]["screenshots_restored"] == 1
        print("Overall Feedback Form:", off)
        # nothing written into the original folder but Completed Audits
        assert sorted(p.name for p in prop.iterdir()) == ["Completed Audits", "Sam Sample", "Tina Test"]
        # inbox: drop a folder in and it starts by itself
        import shutil as _sh
        _sh.copytree(dirs["Tina Test"], home / "inbox" / "Tina Test")
        nb = wait(lambda: next((x for x in call("/api/state")["batches"] if x["id"] != bid), None), 60)
        print("Inbox picked up:", nb["residents"][0]["name"], nb["status"])
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
