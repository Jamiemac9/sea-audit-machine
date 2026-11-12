"""Drag, drop, execute, delivered report: a property folder that holds one .zip per resident
(one downloaded twice), a zip with nothing readable, and a run that gives up without a form.
    python tests/test_drop.py"""
import json, os, shutil, subprocess, sys, tempfile, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / "tests")]
import test_app as ta
from test_privacy import build, SECRETS
from test_tools import make_form

ta.PORT = 8798
ta.BASE = f"http://127.0.0.1:{ta.PORT}"


def zip_dir(src: Path, dest: Path, inner: bool):
    with zipfile.ZipFile(dest, "w") as z:
        for f in src.rglob("*"):
            if f.is_file():
                z.write(f, (Path(src.name) / f.relative_to(src)) if inner else f.relative_to(src))


def main():
    tmp = Path(tempfile.mkdtemp(prefix="drop-"))
    home = tmp / "SupportAudit"; home.mkdir()
    (home / "settings.json").write_text(json.dumps({"claude_path": str(ROOT / "tests" / "fake_claude.py"),
                                                    "output_dir": str(tmp / "Finished")}))   # new install: no check step
    env = dict(os.environ, SA_HOME=str(home), SA_PORT=str(ta.PORT), FAKE_SECRETS=json.dumps(SECRETS))
    srv = subprocess.Popen([sys.executable, "server.py"], cwd=ROOT, env=env, stdout=open(tmp / "server.log", "w"),
                           stderr=subprocess.STDOUT)
    try:
        ta.wait(ta._up, 30)
        form = tmp / "Support_Audit_OG.docx"; make_form(form)
        ta.call("/api/template", files=[("file", ("Support_Audit_OG.docx", form.read_bytes()))], data={"kind": "audit"})
        ta.call("/api/template", files=[("file", ("my feedback form.docx", form.read_bytes()))], data={"kind": "feedback"})
        st = ta.call("/api/state")
        assert st["template"] == "Support Audit OG.docx" and st["feedback_template"] == "Overall Feedback Form OG.docx", st  # both kept
        ta.call("/api/template", files=[("file", ("Support_Audit_OG v2.docx", form.read_bytes()))], data={})
        st = ta.call("/api/state")
        assert st["template"] and st["feedback_template"], "replacing one form removed the other"
        raw = tmp / "raw"; dirs = build(raw)
        (dirs["Tina Test"] / "noform.txt").write_text("zz-no-form-zz")
        prop = tmp / "Zipped Property"; prop.mkdir()
        zip_dir(dirs["Sam Sample"], prop / "Sam_Sample_Audit_File.zip", inner=True)
        shutil.copy(prop / "Sam_Sample_Audit_File.zip", prop / "Sam_Sample_Audit_File (1).zip")   # downloaded twice
        zip_dir(dirs["Tina Test"], prop / "Tina_Test_Audit_file.zip", inner=False)
        odd = tmp / "odd"; odd.mkdir(); (odd / "notes.xyz").write_bytes(b"\x00\x01")
        zip_dir(odd, prop / "Una Unread.zip", inner=False)

        bid = ta.call("/api/batches/from-folder", {"path": str(prop), "ma": "Zip Agent", "several": "auto"})["id"]
        b = ta.wait(lambda: (lambda b: b if b["status"] not in ("redacting",) else None)(ta.call(f"/api/batches/{bid}")))
        names = sorted(b["residents"])
        print("Residents found:", names)
        assert names == ["Sam_Sample_Audit_File", "Tina_Test_Audit_file", "Una Unread"], names
        assert b["status"] in ("approved",), (b["status"], b.get("error"))   # no stop for a check
        una = b["residents"]["Una Unread"]
        assert una["status"] == "empty" and "No documents could be read" in una["error"] and "notes.xyz" in una["error"], una
        b = ta.wait(lambda: (lambda b: b if all(r["status"] in ("done", "failed", "empty") for r in b["residents"].values())
                             and (b.get("feedback") or {}).get("status") in ("done", "failed")
                             else None)(ta.call(f"/api/batches/{bid}")), 400)
        for n, r in b["residents"].items():
            print(f"  {n}: {r['status']} {r.get('rating') or ''} {r.get('error') or ''}")
        assert b["residents"]["Sam_Sample_Audit_File"]["status"] == "done"
        tina = b["residents"]["Tina_Test_Audit_file"]
        assert tina.get("tries") == 3, tina   # tried three times before giving up
        assert tina["status"] == "failed" and "did not save the form" in tina["error"] and "session records are missing" in tina["error"], tina
        assert "[" not in tina["error"], tina["error"]
        report = prop / "Completed Audits" / "Delivered report - Zip Agent.html"
        ta.wait(lambda: report.exists() and "Nothing to audit" in report.read_text(encoding="utf-8"), 30)
        html = report.read_text(encoding="utf-8")
        assert b["feedback"]["status"] == "done", b["feedback"]
        assert "Overall Feedback Form" in html
        assert "1 of 3 delivered" in html and "Support Audit - Sam_Sample_Audit_File.docx" in html, html
        assert "session records are missing" in html
        assert b["has_report"]
        st = ta.call("/api/state")
        rb = next(x for x in st["batches"] if x["id"] == bid)
        assert any(r["error"] for r in rb["residents"]), rb
        print("Delivered report:", report)
        print("ALL DROP TESTS PASSED")
    finally:
        srv.terminate()


if __name__ == "__main__":
    main()
