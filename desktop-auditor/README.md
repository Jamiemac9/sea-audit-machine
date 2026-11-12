# Support Audit

Fills in a resident's Support Audit (Form A) the same way it is done in chat, on your own
computer, **without Claude ever seeing who anyone is.**

## The idea, simply

1. **You drop in a resident's folder.**
2. **Your computer hides everyone's details first.** Names, addresses, postcodes, phone
   numbers, emails, dates of birth, NI and NHS numbers are swapped for labels like
   `[RESIDENT_A]`, `[PERSON_2]`, `[ADDRESS_1]`. This happens on your computer with free,
   open-source tools. Nothing is sent anywhere during this step.
3. **You check it.** The page shows exactly what Claude will get, page by page, and
   confirms it searched the copy again and found none of the hidden details left. If you
   spot a name it missed, type it in and it hides it and checks again.
4. **Claude audits the hidden copy** and writes the form using the labels
   ("[PERSON_2] supported [RESIDENT_A] to…").
5. **Your computer puts the real details back.** Labels become names again and every
   screenshot is re-cut from the original page, then the form is saved in your folder.

The list that links each label to the real person (the "key") never leaves your computer.

**Training:** on Free, Pro and Max accounts, Anthropic only trains on your chats and Claude
Code sessions if the "Help improve Claude" privacy setting is on. Check it is off in your
Claude privacy settings. With it off and redaction on, what Claude sees has no names or
identifiers, and it isn't used to train future models. (Chats you rate with the feedback
buttons are an exception, so don't rate audit runs.)

## What is hidden, and what isn't

| Hidden | Kept, because the audit needs it |
|---|---|
| Resident names (from the folder names), and first names or surnames on their own | Session dates, durations, document codes |
| Anyone else's name: staff, family, professionals (found automatically, plus any you list) | What was done, goals, services named (Jobcentre, GP, CGL) |
| Street addresses and postcodes | Risk scores, ticks, signatures (as images) |
| Phone numbers, emails, NI numbers, NHS numbers, dates of birth, bank details | Health and support needs, without anything saying whose they are |
| The same in file names, form fields, document properties ("last saved by") and photo details | |

Scanned pages and photos are read with Tesseract (open-source OCR) and names on them are
blacked out with the label written in. If a file can't be hidden safely (for example a scan
with OCR not installed, or a file type it can't read), **it is not sent at all**, and the
check screen lists it so you can look at it yourself.

Be aware: handwriting, nicknames and unusual spellings can be missed by any automatic
redaction. That is what the check step is for. Add anything it missed to "Names to always
hide" and it won't miss it again.

## Setting it up on your Mac (once)

1. Install **Python 3** from [python.org](https://www.python.org/downloads/).
2. Install **Claude Code**: open Terminal, paste `curl -fsSL https://claude.ai/install.sh | bash`,
   then type `claude`, log in with your Claude account, and type `/exit`.
3. Install the two free helpers with [Homebrew](https://brew.sh):
   `brew install tesseract` (reads scans and photos) and
   `brew install --cask libreoffice` (opens Word files so they can be hidden properly).
4. Double-click **`Support Audit.command`** in this folder. The first time, macOS may say
   it is from the internet: right-click it, choose Open, then Open. The first run takes a
   few minutes to set itself up. Then the page opens in your browser.

The four chips at the top right of the page should all be green: Claude logged in, Name
finder, Scan reader, Word converter.

**Always running (optional):** in Terminal, from this folder, run
`./deploy/mac-start-at-login.sh`. It then starts with your Mac and you can just bookmark
`http://127.0.0.1:8765`. That address only works on this Mac; nothing else can reach it.

On Windows, double-click `Support Audit (Windows).bat` instead (install Git for Windows
before Claude Code).

## Each audit

1. **Once:** upload the blank `Support_Audit_OG.docx`, your reference files (house style,
   rules, your `SKILL.md`, completed audits), and list the names to always hide (support
   workers, managers).
2. Give it the resident's folder, any of these ways:
   - **Paste its location** (easiest): in File Explorer open the folder, click the address
     bar, copy, paste into the page, press "Use this folder".
   - Put the folder in `SupportAudit\inbox` and click it on the page.
   - "Choose a folder…" (go *into* the folder and press Upload: the files don't show in
     that window, which is normal), "Choose files…", or drag them onto the page.

   For a whole property, tick "several residents". Type the managing agent, press **Start**.
3. When it says **ready to check**, click through "What Claude will see", then press
   **Looks right: send to Claude**.
4. When it's **done**: **Open in Word**. It's also saved in your "Save finished forms in"
   folder, under the managing agent's name.
5. When the round is closed, **Delete this round** removes the copies and the key.

## Where things are

| Path | What it is |
|---|---|
| `Support Audit.command`, `Support Audit (Windows).bat` | Double-click to open |
| `server.py`, `web/index.html` | The page and the queue (this computer only) |
| `pipeline.py` | Hide → check → Claude → put back, for a round |
| `privacy/redact.py` | Hides the details (redaction in) |
| `privacy/reidentify.py` | Puts them back and re-cuts screenshots (redaction out) |
| `runner.py` | Starts Claude Code on the hidden copy only, with private folders blocked |
| `agent/` | Claude's instructions, the audit skill and the form-filling tools |
| `deploy/` | Start-with-the-Mac script, and the files for moving it to a server later |
| `tests/` | `test_tools.py`, `test_privacy.py`, `test_app.py`: all on invented data |

Private files live in `SupportAudit` in your home folder and never in this repository.
