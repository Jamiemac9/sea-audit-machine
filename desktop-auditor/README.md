# Support Audit desktop app

Fills in a resident's Support Audit (Form A) on your own computer, the same way it is done
in chat. You pick the resident's folder, press **Start**, and a few minutes later
`Support Audit - <Name>.docx` is sitting in that folder.

It works on a Mac and on Windows. It runs on your Claude login through Claude Code, so
there is no API key to pay for separately.

## How it works

Think of it as two workers:

1. **Claude does the thinking and the writing.** It reads every document, checks the
   sessions, decides YES/NO/N/A, writes What support has been given, Strengths, Next Steps
   and General Notes, and gives the rating. It follows the `sea-support-audit` skill word
   for word, plus your house style and completed audits in the reference folder.
2. **Fixed scripts do the fiddly parts identically every time.** They read the PDFs
   (including ticks and signatures), spot pasted signatures, copied paragraphs and
   impossible risk scores, cut plain screenshots, and write into the form in Aptos 12 with
   highlighted YES/NO/N/A, dash bullets and 14.8 cm screenshots. Then they turn it into a
   PDF and Claude looks at every page before it finishes.

That split is why it should come out the same every time: the words come from the same
instructions, and the layout can't drift because it is code, not a fresh attempt each time.

## Setting it up (once per computer)

**1. Install Python 3** from [python.org](https://www.python.org/downloads/).
On Windows, tick **"Add python.exe to PATH"** on the first screen of the installer.

**2. Install Claude Code and log in.**
- Mac: open Terminal and paste `curl -fsSL https://claude.ai/install.sh | bash`
- Windows: install [Git for Windows](https://git-scm.com/download/win) first (Claude Code
  needs it), then open PowerShell and paste `irm https://claude.ai/install.ps1 | iex`

Then type `claude`, press Enter, and log in with your Claude account. Type `/exit` to close
it. You only do this once.

**3. Install LibreOffice** (free, [libreoffice.org](https://www.libreoffice.org/download/)).
This is how the app turns the finished form into pages so Claude can look at every one
before saying it is done. Without it the form is still made, you just check it yourself.

**4. Make your private reference folder.** In your home folder, create
`SupportAudit/reference` and put in it:
- the reference pack sent with this build (house style, Form A rules, working rules)
- your **completed Form A documents** from the round you treat as the benchmark (the main
  model), plus any older completed set you still want it to see
- optional: a copy of your latest `SKILL.md`. If it is there, the app uses it instead of
  the copy in this repo, so when you change the skill in Claude you just drop the new one in.

Nothing in that folder ever goes into GitHub.

**5. Open the app.**
- Mac: double-click `start-mac.command` (first time: right-click → Open, then Open again,
  because macOS asks about files from the internet)
- Windows: double-click `start-windows.bat`

The first open takes a minute while it installs what it needs.

## Using it

1. **Blank form**: choose `Support_Audit_OG.docx`. **Reference folder**: your
   `SupportAudit/reference`. Both are remembered.
2. Type the **managing agent** name as on the licence, check the **audit date**, and tick
   **Follow-up audit** if it is not their first.
3. **Add folder…** for one resident, or **Add every folder in…** to queue a whole property.
4. Press **Start**. The window shows what it is doing. Each finished form is saved into its
   resident's folder (never overwriting: a second run is saved as `(2)`), and the rating,
   main findings and anything for you to screenshot yourself appear in the window.

You can also run one without the window:

```bash
.venv/bin/python runner.py "/path/to/Resident Folder" --ma "Agent Name Ltd" --date 10/11/26
```

## Where things are

| Path | What it is |
|---|---|
| `app.py` | The window |
| `runner.py` | Starts Claude Code with the right folders, instructions and tools |
| `agent/CLAUDE.md` | The order of work for each audit |
| `agent/skills/sea-support-audit/SKILL.md` | The audit skill (Aptos 12; real names removed for the repo) |
| `agent/tools/read_pack.py` | Reads every document; ticks, metadata, reused images, copied text, risk scores |
| `agent/tools/inspect_template.py` | Maps every table and cell of the blank form |
| `agent/tools/crop.py` | Plain screenshots, and two joined for comparisons |
| `agent/tools/formkit.py` | The fixed way of writing into the form |
| `agent/tools/finish.py` | Opens the result, checks fonts and em dashes, renders every page |
| `tests/test_tools.py` | Runs every tool on an invented resident; `python tests/test_tools.py` |

## Privacy

Resident documents are read on your computer and sent to Claude to be audited, which is the
same as uploading them in chat today. Copies made while working go to
`SupportAudit/work/` in your home folder; delete old runs from there when a round is closed.
Nothing is written to this repository, and web access is switched off for every run.
