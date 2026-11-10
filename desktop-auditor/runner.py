"""Runs one audit through Claude Code, using the Claude login on this computer.

Can be used without the window:
    python runner.py "<resident folder>" [--ma "Example Housing Ltd"] [--date 10/11/26] [--follow-up]

Private material lives in a SupportAudit folder in your home folder, never in this repo:
    SupportAudit/
      settings.json      remembered choices
      reference/         house style, working rules, completed audits, optional SKILL.md override
      runtime/           rebuilt every run: CLAUDE.md, the skill and the tools
      work/<run>/        everything read and made during a run (resident data, keep private)
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
AGENT_DIR = APP_DIR / "agent"
HOME = Path.home() / "SupportAudit"
SETTINGS = HOME / "settings.json"
TOOLS_ALLOWED = "Bash,Read,Write,Edit,MultiEdit,Glob,Grep,Skill,TodoWrite"
TOOLS_BLOCKED = "WebFetch,WebSearch"


# ---------- settings ----------

def load_settings() -> dict:
    defaults = {"template": "", "reference": str(HOME / "reference"), "claude_path": "", "model": ""}
    try:
        defaults.update(json.loads(SETTINGS.read_text(encoding="utf-8")))
    except Exception:
        pass
    return defaults


def save_settings(s: dict):
    HOME.mkdir(parents=True, exist_ok=True)
    SETTINGS.write_text(json.dumps(s, indent=2), encoding="utf-8")


# ---------- finding Claude Code ----------

def find_claude(preferred: str = "") -> str | None:
    if preferred and Path(preferred).exists():
        return preferred
    found = shutil.which("claude")
    if found:
        return found
    home = Path.home()
    for p in (home / ".local/bin/claude", home / ".claude/local/claude", Path("/opt/homebrew/bin/claude"),
              Path("/usr/local/bin/claude"), home / ".local/bin/claude.exe",
              home / "AppData/Roaming/npm/claude.cmd", home / "AppData/Local/Programs/claude/claude.exe"):
        if p.exists():
            return str(p)
    return None


def _cmd_prefix(claude: str) -> list[str]:
    return ["cmd", "/c", claude] if claude.lower().endswith((".cmd", ".bat")) else [claude]


# ---------- one run ----------

def resident_name_guess(folder: Path) -> str:
    return re.sub(r"\s+", " ", folder.name).strip()


def unique_output(folder: Path, name: str) -> Path:
    out = folder / f"Support Audit - {name}.docx"
    n = 2
    while out.exists():
        out = folder / f"Support Audit - {name} ({n}).docx"
        n += 1
    return out


def build_runtime(job: dict) -> Path:
    """Fresh copy of the agent folder with this run's details filled in."""
    runtime = HOME / "runtime"
    if runtime.exists():
        shutil.rmtree(runtime)
    (runtime / ".claude" / "skills").mkdir(parents=True)
    shutil.copytree(AGENT_DIR / "tools", runtime / "tools")
    skill_dst = runtime / ".claude" / "skills" / "sea-support-audit"
    shutil.copytree(AGENT_DIR / "skills" / "sea-support-audit", skill_dst)
    override = Path(job["reference"]) / "SKILL.md"
    if override.exists():  # your own up-to-date copy of the skill wins over the repo copy
        shutil.copy(override, skill_dst / "SKILL.md")
    text = (AGENT_DIR / "CLAUDE.md").read_text(encoding="utf-8")
    fields = {
        "RESIDENT": job["folder"], "TEMPLATE": job["template"], "REFERENCE": job["reference"],
        "WORK": job["work"], "PY": Path(sys.executable).as_posix(), "TOOLS": (runtime / "tools").as_posix(),
        "OUTPUT": job["output"], "MA": job.get("ma") or "take it from the licence agreement in the file",
        "AUDIT_DATE": job["date"], "AUDIT_TYPE": "Follow-up audit" if job.get("follow_up") else "First audit (baseline)",
        "NOTES": job.get("notes") or "none",
    }
    for k, v in fields.items():
        text = text.replace("{{" + k + "}}", str(v))
    (runtime / "CLAUDE.md").write_text(text, encoding="utf-8")
    return runtime


def make_job(folder: str, settings: dict, ma="", date="", follow_up=False, notes="") -> dict:
    folder_p = Path(folder).expanduser().resolve()
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    work = HOME / "work" / f"{stamp}_{re.sub(r'[^A-Za-z0-9]+', '_', folder_p.name)}"
    work.mkdir(parents=True, exist_ok=True)
    return {
        "folder": str(folder_p), "template": str(Path(settings["template"]).expanduser().resolve()),
        "reference": str(Path(settings["reference"]).expanduser().resolve()), "work": str(work),
        "output": str(unique_output(folder_p, resident_name_guess(folder_p))),
        "ma": ma, "date": date or dt.date.today().strftime("%d/%m/%y"), "follow_up": follow_up,
        "notes": notes,
    }


def check_job(job: dict, claude: str | None) -> list[str]:
    problems = []
    if not claude:
        problems.append("Claude Code is not installed or not found. See README step 2.")
    if not Path(job["folder"]).is_dir():
        problems.append(f"Resident folder not found: {job['folder']}")
    if not Path(job["template"]).is_file():
        problems.append("Choose the blank Support_Audit_OG.docx first.")
    if not Path(job["reference"]).is_dir():
        problems.append(f"Reference folder not found: {job['reference']} (README step 4)")
    return problems


class Run:
    """Start Claude Code headless and stream what it is doing to a callback."""

    def __init__(self, job: dict, settings: dict, on_line):
        self.job, self.settings, self.on_line = job, settings, on_line
        self.proc: subprocess.Popen | None = None
        self.result_text = ""
        self.ok = False

    def command(self, claude: str, runtime: Path) -> list[str]:
        job = self.job
        prompt = (f"Audit the resident file at {job['folder']} and complete Form A from the blank form at "
                  f"{job['template']}, following CLAUDE.md and the sea-support-audit skill. "
                  f"Save it as {job['output']}.")
        cmd = _cmd_prefix(claude) + [
            "-p", prompt, "--output-format", "stream-json", "--verbose",
            "--allowedTools", TOOLS_ALLOWED, "--disallowedTools", TOOLS_BLOCKED,
            "--permission-mode", "acceptEdits",
            "--add-dir", job["folder"], str(Path(job["template"]).parent), job["reference"], job["work"],
        ]
        if self.settings.get("model"):
            cmd += ["--model", self.settings["model"]]
        return cmd

    def start(self):
        claude = find_claude(self.settings.get("claude_path", ""))
        problems = check_job(self.job, claude)
        if problems:
            for p in problems:
                self.on_line("! " + p)
            return False
        runtime = build_runtime(self.job)
        env = dict(os.environ)
        env.pop("ANTHROPIC_API_KEY", None)  # use the Claude login, not an API key
        log = open(Path(self.job["work"]) / "run-log.jsonl", "w", encoding="utf-8")
        self.on_line(f"Started. Work files: {self.job['work']}")
        self.proc = subprocess.Popen(self.command(claude, runtime), cwd=runtime, env=env,
                                     stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                     text=True, encoding="utf-8", errors="replace", bufsize=1)
        for raw in self.proc.stdout:
            log.write(raw)
            self._handle(raw.strip())
        self.proc.wait()
        log.close()
        self.ok = self.proc.returncode == 0 and Path(self.job["output"]).exists()
        if self.ok:
            self.on_line(f"Done: {self.job['output']}")
        else:
            self.on_line(f"! Finished without a saved form (exit {self.proc.returncode}). "
                         f"See run-log.jsonl in {self.job['work']}")
        return self.ok

    def stop(self):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()

    def _handle(self, raw: str):
        if not raw:
            return
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            self.on_line(raw)
            if "login" in raw.lower() or "auth" in raw.lower():
                self.on_line("! Open Terminal / Command Prompt, type  claude  and log in once, then try again.")
            return
        kind = msg.get("type")
        if kind == "assistant":
            for block in msg.get("message", {}).get("content", []):
                if block.get("type") == "text" and block.get("text", "").strip():
                    self.on_line(block["text"].strip())
                elif block.get("type") == "tool_use":
                    self.on_line("  > " + _describe_tool(block))
        elif kind == "result":
            self.result_text = msg.get("result") or ""
            if msg.get("is_error"):
                self.on_line("! " + (self.result_text or "Claude Code reported an error"))
                if re.search(r"(?i)auth|log ?in|credential", self.result_text):
                    self.on_line("! Open Terminal (Mac) or Command Prompt (Windows), type  claude  and "
                                 "log in once with your Claude account, then press Start again.")


def _describe_tool(block: dict) -> str:
    name, inp = block.get("name", ""), block.get("input", {}) or {}
    if name == "Bash":
        cmd = inp.get("command", "")
        for tool in ("read_pack", "inspect_template", "crop", "fill.py", "finish"):
            if tool in cmd:
                return {"read_pack": "Reading documents", "inspect_template": "Mapping the form",
                        "crop": "Cutting a screenshot", "fill.py": "Filling the form",
                        "finish": "Checking the finished form"}[tool]
        return "Running: " + cmd[:90]
    if name == "Read":
        return "Reading " + Path(inp.get("file_path", "")).name
    if name in ("Write", "Edit", "MultiEdit"):
        return "Writing " + Path(inp.get("file_path", "")).name
    if name == "Skill":
        return "Loading the audit skill"
    return name


def main(argv):
    import argparse
    ap = argparse.ArgumentParser(description="Run one Support Audit without the window")
    ap.add_argument("folder")
    ap.add_argument("--ma", default="")
    ap.add_argument("--date", default="")
    ap.add_argument("--follow-up", action="store_true")
    ap.add_argument("--notes", default="")
    a = ap.parse_args(argv)
    settings = load_settings()
    job = make_job(a.folder, settings, a.ma, a.date, a.follow_up, a.notes)
    run = Run(job, settings, print)
    ok = run.start()
    if run.result_text:
        print("\n" + run.result_text)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main(sys.argv[1:])
