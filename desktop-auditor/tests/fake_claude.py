#!/usr/bin/env python3
"""Stand-in for Claude Code in tests. It does what Claude would (writes a form with
placeholders and a screenshot) and FAILS if it can see any real detail listed in
FAKE_SECRETS in its instructions, its prompt or any file in the folders it is given."""
import json, os, re, subprocess, sys
from pathlib import Path
a = sys.argv[1:]
if a[:2] == ["auth", "status"]:
    print(json.dumps({"loggedIn": True, "authMethod": "claude.ai"})); sys.exit(0)
secrets = [s.lower() for s in json.loads(os.environ.get("FAKE_SECRETS", "[]"))]
prompt = a[a.index("-p") + 1]
dirs = [a[i + 1] for i, x in enumerate(a) if x == "--add-dir"] + [a[i] for i in range(len(a)) if i and a[i - 1] == "--add-dir"]
dirs = list(dict.fromkeys(dirs))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from privacy.redact import extract_text
seen = [("prompt", prompt), ("CLAUDE.md", Path("CLAUDE.md").read_text())]
for d in dirs:
    for p in Path(d).rglob("*"):
        if p.is_file() and "skills" not in p.parts:
            seen.append((str(p), p.name + "\n" + (extract_text(p) or (p.read_text(errors="ignore") if p.suffix in (".txt", ".md", ".json") else ""))))
for where, text in seen:
    for s in secrets:
        if re.search(r"(?<![a-z0-9])" + re.escape(s) + r"(?![a-z0-9])", text.lower()):
            print(json.dumps({"type": "result", "is_error": True, "result": f"LEAK: saw '{s}' in {where}"})); sys.exit(1)
out = re.search(r"Save it as (.+\.docx)\.$", prompt).group(1)
tpl = re.search(r"blank form at (.+?\.docx)", prompt).group(1)
folder = re.search(r" at (.+?) and complete", prompt).group(1)
tools = Path("tools")
src = next(p for p in Path(folder).rglob("*.pdf") if "weekly budget" in extract_text(p))
shots = Path(out).parent / "shots"; shots.mkdir(exist_ok=True)
subprocess.run([sys.executable, str(tools / "crop.py"), "find", str(src), "1", "weekly budget", str(shots / "1.png")], check=True, capture_output=True)
sys.path.insert(0, str(tools)); import formkit as fk
doc = fk.open_form(tpl)
me = re.search(r"file of (\[RESIDENT_[A-Z]\])", prompt).group(1)
fk.fill(doc.tables[0].cell(1, 1), me)
p = fk.heading_after(doc.tables[2].cell(0, 0).paragraphs[0], "Support with Managing Money:")
p = fk.text_after(p, "[PERSON_1] supported [RESIDENT_A] to complete a weekly budget sheet.")
fk.screenshot_after(p, shots / "1.png", "Same paragraph in two residents' files")
fk.save(doc, out)
res = "Rating: Amber - support delivered by [PERSON_1]; [RESIDENT_A]'s paragraph also appears in [RESIDENT_B]'s file."
for msg in ({"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Skill", "input": {}}]}},
            {"type": "assistant", "message": {"content": [{"type": "text", "text": res}]}},
            {"type": "result", "is_error": False, "result": res}):
    print(json.dumps(msg), flush=True)
