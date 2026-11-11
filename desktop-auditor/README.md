# Support Audit

Fills in a resident's Support Audit (Form A) the same way it is done in chat, from a private
web page you can open on your Mac, your Windows PC or your phone, at any time.

It lives on your own server and runs on your Claude login through Claude Code, so there is
no API key to pay for. Only your own devices can open the page: it is published through
Tailscale, not the open internet.

## How it works

Think of it as two workers on the server:

1. **Claude does the thinking and the writing.** It reads every document, checks the
   sessions, decides YES/NO/N/A, writes What support has been given, Strengths, Next Steps
   and General Notes, and gives the rating. It follows the `sea-support-audit` skill, plus
   your house style and completed audits from the reference files.
2. **Fixed scripts do the fiddly parts identically every time.** They read the PDFs
   (including ticks and signatures), spot pasted signatures, copied paragraphs and
   impossible risk scores, cut plain screenshots, and write into the form in Aptos 12 with
   highlighted YES/NO/N/A, dash bullets and 14.8 cm screenshots. Then they turn it into
   pages and Claude looks at every one before it finishes.

## Using it

1. Open the page (the address the install prints, like `https://london-vps.your-tailnet.ts.net`).
2. **Once:** upload the blank `Support_Audit_OG.docx` and your reference files (house
   style, rules, your `SKILL.md`, your completed audits). They stay on the server.
3. **Each audit:** drop the resident's folder on the box, type the managing agent, check the
   date, press **Start audit**. To do a whole property, drop the property folder and tick
   "This folder holds several residents".
4. Watch it work, then press **Download form**. The rating and anything you need to
   screenshot yourself are shown above the log.
5. When a round is closed, press **Delete job and files** so resident files don't sit on the
   server.

Audits run one at a time, in order. You can close the page: it carries on, and the
results are there when you come back.

## Setting it up on the server (once)

You need: an Ubuntu or Debian server that is switched on (your London VPS), Tailscale on the
server and on your devices, and the repo on the server.

**1. Get the code onto the server.** On the server:

```bash
git clone https://github.com/Jamiemac9/sea-audit-machine.git
cd sea-audit-machine
git checkout desktop-auditor     # until the pull request is merged
```

(Once the repo is private, GitHub will ask you to sign in: run `gh auth login` first.)

**2. Make sure Tailscale is on:** `sudo tailscale up`

**3. Install:**

```bash
sudo ./desktop-auditor/deploy/install.sh
```

It installs everything, starts the app so it restarts by itself after a reboot, and prints
the private address.

**4. Log Claude in, once:**

```bash
sudo -iu supportaudit claude auth login
```

It shows a link. Open it on your phone or laptop, sign in to Claude, and paste the code
back. The top right of the page then says **Claude: logged in**.

**Optional password on top of Tailscale:** put `SA_PASSWORD=something` in
`/etc/supportaudit.env`, then `sudo systemctl restart supportaudit`.

## Updating

```bash
cd sea-audit-machine && git pull && sudo ./desktop-auditor/deploy/install.sh
```

Your login, blank form, reference files and audits are kept.

## If something is wrong

| You see | Do this |
|---|---|
| Page won't open | Is the server on? Is Tailscale on, on this device too? On the server: `sudo systemctl status supportaudit` |
| "Claude is not logged in" | Step 4 again |
| An audit says failed | Read the last lines of its log; press **Retry** |
| Want the server's own log | `sudo journalctl -u supportaudit -n 100` |

## Running one without the page

On any computer with Claude Code logged in:

```bash
python runner.py "/path/to/Resident Folder" --ma "Agent Name Ltd" --date 11/11/26
```

## Where things are

| Path | What it is |
|---|---|
| `server.py` + `web/index.html` | The private web page and the audit queue |
| `runner.py` | Starts Claude Code with the right folders, instructions and tools |
| `deploy/install.sh`, `deploy/supportaudit.service` | Server install and the always-on service |
| `agent/CLAUDE.md` | The order of work for each audit |
| `agent/skills/sea-support-audit/SKILL.md` | The audit skill (real names removed for the repo; your own `SKILL.md` in the reference files wins) |
| `agent/tools/read_pack.py` | Reads every document: ticks, metadata, reused images, copied text, risk scores |
| `agent/tools/inspect_template.py` | Maps every table and cell of the blank form |
| `agent/tools/crop.py` | Plain screenshots, and two joined for comparisons |
| `agent/tools/formkit.py` | The fixed way of writing into the form |
| `agent/tools/finish.py` | Opens the result, checks fonts and em dashes, renders every page |
| `tests/test_tools.py` | Runs every tool on an invented resident: `python tests/test_tools.py` |

## Privacy

Resident files are uploaded to your server over Tailscale (encrypted), kept in an
owner-only folder, and sent to Claude to be audited, which is the same as uploading them in
chat today. Nothing is written to this repository, web access is switched off for every
audit, and **Delete job and files** removes everything for that resident from the server.
