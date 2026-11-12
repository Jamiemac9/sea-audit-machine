"""Starts Claude Code on one REDACTED resident file, using the Claude login on this computer.

Claude Code is only ever given the redacted copy of a round, the blank form and the
redacted reference files. pipeline.py does the redaction before and the re-identification
after; this module only runs Claude and reports what it is doing.
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
HOME = Path(os.environ.get("SA_HOME") or (Path.home() / "SupportAudit")).expanduser()
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


# On Windows a console program started from a windowless app opens its own terminal window.
# This flag stops that (the "terminal popping up").
NO_WINDOW = {"creationflags": 0x08000000} if os.name == "nt" else {}


def login_status(claude: str | None) -> dict:
    """Ask Claude Code whether it is logged in. Free: sends no message."""
    if not claude:
        return {"loggedIn": False, "reason": "Claude Code is not installed"}
    try:
        out = subprocess.run(_cmd_prefix(claude) + ["auth", "status", "--json"], capture_output=True,
                             text=True, timeout=60, **NO_WINDOW)
        data = json.loads(out.stdout or "{}")
    except Exception as e:  # could not tell (slow start, update in progress): say so, don't say "logged out"
        return {"loggedIn": None, "reason": f"{type(e).__name__}: {e}"}
    if "loggedIn" not in data:
        return {"loggedIn": None, "reason": (out.stderr or out.stdout or "no answer")[:300]}
    return {"loggedIn": bool(data.get("loggedIn")), "method": data.get("authMethod"),
            "expires": data.get("loginExpiresAt")}


def _cmd_prefix(claude: str) -> list[str]:
    return ["cmd", "/c", claude] if claude.lower().endswith((".cmd", ".bat")) else [claude]


# ---------- one run ----------

def build_runtime(job: dict) -> Path:
    """Fresh copy of the agent folder with this run's details filled in, plus rules that stop
    Claude Code opening anything private (original files, the key, the unredacted reference)."""
    runtime = HOME / "runtime"
    if runtime.exists():
        shutil.rmtree(runtime)
    (runtime / ".claude" / "skills").mkdir(parents=True)
    shutil.copytree(AGENT_DIR / "tools", runtime / "tools")
    skill_dst = runtime / ".claude" / "skills" / "sea-support-audit"
    shutil.copytree(AGENT_DIR / "skills" / "sea-support-audit", skill_dst)
    if job.get("skill_override") and Path(job["skill_override"]).exists():
        shutil.copy(job["skill_override"], skill_dst / "SKILL.md")  # your own up-to-date skill wins
    deny = []
    for d in job.get("private_dirs", []):
        pattern = "/" + Path(d).resolve().as_posix().lstrip("/") + "/**"
        deny += [f"{tool}(/{pattern})" for tool in ("Read", "Edit", "Write", "Glob", "Grep")]
    (runtime / ".claude" / "settings.json").write_text(json.dumps({"permissions": {"deny": deny}}, indent=2),
                                                       encoding="utf-8")
    text = (AGENT_DIR / job.get("instructions", "CLAUDE.md")).read_text(encoding="utf-8")
    fields = {
        "RESIDENT": job.get("folder", ""), "ROUND": job["round"], "AUDITS": job.get("audits", ""), "TEMPLATE": job["template"],
        "REFERENCE": job["reference"], "WORK": job["work"], "PY": Path(sys.executable).as_posix(),
        "TOOLS": (runtime / "tools").as_posix(), "OUTPUT": job["output"],
        "MA": job.get("ma") or "take it from the licence agreement in the file",
        "AUDIT_DATE": job["date"], "AUDIT_TYPE": "Follow-up audit" if job.get("follow_up") else "First audit (baseline)",
        "NOTES": job.get("notes") or "none", "LABEL": job.get("label", ""),
    }
    for k, v in fields.items():
        text = text.replace("{{" + k + "}}", str(v))
    (runtime / "CLAUDE.md").write_text(text, encoding="utf-8")
    return runtime


def check_job(job: dict, claude: str | None) -> list[str]:
    problems = []
    if not claude:
        problems.append("Claude Code is not installed or not found. See the README, step 2.")
    if job.get("folder") and not Path(job["folder"]).is_dir():
        problems.append("The redacted copy of this resident's file is missing. Delete the audit and add it again.")
    if not Path(job["template"]).is_file():
        problems.append("Upload the blank Support_Audit_OG.docx first.")
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
        prompt = job.get("prompt") or (
            f"Audit the resident file of {job['label']} at {job['folder']} and complete Form A from the "
            f"blank form at {job['template']}, following CLAUDE.md and the sea-support-audit skill. "
            f"Save it as {job['output']}.")
        cmd = _cmd_prefix(claude) + [
            "-p", prompt, "--output-format", "stream-json", "--verbose",
            "--allowedTools", TOOLS_ALLOWED, "--disallowedTools", TOOLS_BLOCKED,
            "--permission-mode", "acceptEdits",
            "--add-dir", job["round"], str(Path(job["template"]).parent), job["reference"], job["work"],
        ] + sum((["--add-dir", d] for d in job.get("extra_dirs", [])), [])
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
                                     text=True, encoding="utf-8", errors="replace", bufsize=1, **NO_WINDOW)
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
        for tool in ("score.py", "read_pack", "inspect_template", "crop", "fill.py", "finish"):
            if tool in cmd:
                return {"score.py": "Scoring the file", "read_pack": "Reading documents",
                        "inspect_template": "Mapping the form", "crop": "Cutting a screenshot",
                        "fill.py": "Filling the form", "finish": "Checking the finished form"}[tool]
        return "Running: " + cmd[:90]
    if name == "Read":
        return "Reading " + Path(inp.get("file_path", "")).name
    if name in ("Write", "Edit", "MultiEdit"):
        return "Writing " + Path(inp.get("file_path", "")).name
    if name == "Skill":
        return "Loading the audit skill"
    return name
