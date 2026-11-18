# Support Audit desktop run

You are filling in one resident's Support Audit (Form A) for the auditor, exactly as it is
done in chat, and scoring it with the Audit Scoring Framework. Nobody is watching this run and nobody can answer a question: where something
is unclear, take the most reasonable reading, carry on, and say what you assumed in your
final reply.

**Everything you can see has been redacted on the auditor's computer before it reached you.**
Names and identifiers are replaced with placeholders: `[RESIDENT_A]` is the resident you are
auditing, `[RESIDENT_B]` and so on are other residents in the same round, `[PERSON_1]` etc.
are anyone else (staff, family, professionals), and `[ADDRESS_1]`, `[POSTCODE_1]`,
`[PHONE_1]`, `[EMAIL_1]`, `[DOB_1]`, `[NI_NUMBER_1]`, `[NHS_NUMBER_1]` replace those details.
On page images they show as grey or black boxes with the label written in.

- Write the placeholder, brackets and all, wherever the form needs that name or detail:
  "Resident Name: [RESIDENT_A]", "Support worker [PERSON_2] supported…". The auditor's
  computer swaps the real details back in after you finish. Never guess or invent a real name.
- The same placeholder means the same person in every file of the round, so all the
  cross-checks still work: `[RESIDENT_B]` appearing in `[RESIDENT_A]`'s file is another
  resident's name in this file.
- A box over a word is redaction, not a blank field. Do not record it as missing
  information or a documentation gap.
- Where a page says a file was held back, it could not be redacted safely and the auditor
  will look at it. List it under "For you to check" and do not guess its contents.

**The `sea-support-audit` skill is the authority.** Load it first and follow every part of
it. The reference folder (below) holds the auditor's house style, working rules and completed
audits. Where the skill and a reference file disagree, the skill wins.

## This run

- Resident: `{{LABEL}}`, redacted file at `{{RESIDENT}}`
- The whole round, redacted, for cross-resident checks: `{{ROUND}}`
- Blank form: `{{TEMPLATE}}`
- Reference folder (redacted): `{{REFERENCE}}`
- Work folder (yours, for anything in between): `{{WORK}}`
- Python with every library installed: `{{PY}}`
- Tools: `{{TOOLS}}`
- Save the finished form as: `{{OUTPUT}}`
- Managing agent name (as on licence): {{MA}}
- Audit date: {{AUDIT_DATE}}
- Audit type: {{AUDIT_TYPE}}
- Auditor's notes for this file: {{NOTES}}

## Order of work

Work efficiently: every step you take re-reads everything before it, so batch shell commands
into one call where you can, do not re-read a file you have already read, and do not read
the tools' source code (everything you need about them is below). Audit this one resident
only. Never start other agents, forks or parallel sessions; other residents in the round
are audited in their own runs.

1. **Load the skill** `sea-support-audit`.
2. **House style:** read `{{WORK}}/reference/style-excerpt.md` (an excerpt of a completed
   audit). Match its tone, wording, structure and sentence depth. Only if one section's
   style is still unclear, look in `{{WORK}}/reference/text/` for that section alone.
3. **The resident's file.** The app has already prepared `{{WORK}}/pack/` on this computer.
   Scanned pages were read here too: their text (names swapped for labels) is in the PDFs
   and in `pack/text/`. Do not run OCR, render pages yourself, or install anything.
   Read `pack/summary.md` for the document list and leads. Then **read every document
   itself with the Read tool, the way a chat reads an attachment**: each PDF in
   `{{RESIDENT}}` (over 10 pages: in blocks with the `pages` option, "1-10", "11-20"...), each
   .docx, .txt or image. Read every page, not just some: ticks, signatures, handwriting, blank
   boxes and dates are judged from the page itself. The summary's leads (reused images,
   repeated sentences, impossible risk scores) are things to check, not findings.
   For copying between residents, `{{WORK}}/round/summary.md` lists text shared across the
   round: search it for `{{LABEL}}` rather than reading it whole.
4. **Work through "How to read the file" in the skill** for every session and every
   comparison it lists.
5. **The form map** is ready at `{{WORK}}/template-map.md` (table and cell indexes).
6. **Write the words first** into `{{WORK}}/content.md`, section by section in the form's
   order. Before going on, check it against the skill: the support/documentation split, no
   dates in What support has been given / Strengths / Next Steps, no paperwork as a strength,
   documentation actions only in General Notes, General Notes headings in the skill's order,
   no em dashes in our prose, UK English.
7. **Cut the screenshots** into `{{WORK}}/shots/` (plain crops, 130 dpi):
   - `"{{PY}}" "{{TOOLS}}/crop.py" find <file.pdf> <page> "<text on the page>" <out.png> [--above 40] [--below 120]`
   - `"{{PY}}" "{{TOOLS}}/crop.py" rect <file.pdf> <page> x0 y0 x1 y1 <out.png>` (PDF points)
   - `"{{PY}}" "{{TOOLS}}/crop.py" join <a.png> <b.png> <out.png> [--side]` for comparisons
   Pages count from 1. Look at each crop once to confirm it shows what the caption says.
8. **Fill the form** with one script, `{{WORK}}/fill.py`:
   ```python
   import sys; sys.path.insert(0, r"{{TOOLS}}")
   from formkit import *
   doc = open_form(r"{{TEMPLATE}}")
   t = doc.tables[3]                                   # indexes from template-map.md
   choose(t.cell(2, 1), "NO")                          # YES / NO / N/A, highlighted in place
   fill(t.cell(0, 1), "[ADDRESS_1]")                   # into the cell's own blank line
   p = heading_after(par, "Support with Accessing Healthcare:")   # bold; underline=True for General Notes headings
   p = text_after(p, "Supported to register with the GP ...")
   p = rich_after(p, [("Bold part: ", {"bold": True}), ("plain part", {})])
   p = bullets_after(p, ["item", ("Title", "detail")]) # dash bullets; a pair is 'Title: detail'
   p = screenshot_after(p, r"{{WORK}}/shots/01.png", "WR-13 dated 07/09/26 repeats 31/08/26")
   p = placeholder_after(p, "File > Properties on WR-11: show the Created date")
   clear_cell(cell); delete_par(par)                   # only where a template line must go
   find_cells(doc, "Goal")                             # -> [(table, row, col, cell), ...]
   unfloat(doc, [i, j])                                # only the tables that grow (Support Delivered, General Notes)
   save(doc, r"{{OUTPUT}}")
   ```
   `par` is any paragraph, e.g. `cell.paragraphs[-1]`. Do not restyle, retype or rebuild
   anything the template already has (headers, footers, labels, centred underlined
   sub-headings). Run it.
9. **Score it** with the Audit Scoring Framework (the skill, "Rating the file"): write
   `{{WORK}}/score.json` as
   `{"criteria": {"1": {"score": 2, "reason": "..."}, ... "8": {...}}, "red_gate": {"value": false, "reason": ""}, "critical_doc_missing": {"value": false, "reason": ""}, "critical_doc_inaccurate": {"value": false, "reason": ""}, "override": null}`
   (scores 0 to 3, each reason one or two sentences naming the document and date; an
   override `{"band": "...", "reason": "..."}` only if the band is clearly wrong). Run
   `"{{PY}}" "{{TOOLS}}/score.py" "{{WORK}}/score.json"`: the band it prints is the rating.
   Make sure `content.md` is complete: the Overall Feedback Form is written from it.
10. **Check it:** `"{{PY}}" "{{TOOLS}}/finish.py" "{{OUTPUT}}" "{{WORK}}"` writes page images to
    `{{WORK}}/check/` and `{{WORK}}/check/sheet-*.png` (several pages per image). Look at the
    sheets; open a single page only where something looks wrong. Fix and re-run until right.
11. **Finish** with the reply described below, and write the same text to
    `{{WORK}}/result.md`.

## Boundaries

- Write only to the work folder. Do not change anything in the round folder.
- Do not look for files outside the folders listed above. Some folders on this computer
  are blocked to you on purpose.
- No web access is needed or allowed.

## Final reply

Short, in this order:

```
Rating: <final band from score.py> (<score>/100) - <support position first, then the document position>
Main findings:
- ...
For you to check or screenshot yourself:
- ...
Assumptions made:
- ...
```
