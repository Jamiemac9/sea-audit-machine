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

1. **Load the skill** `sea-support-audit`.
2. **Read the reference folder in full.** Every file in it, including the completed audits.
   The completed Form A documents are the model: match their tone, wording, structure and
   sentence depth precisely, not approximately. For .docx and .pdf files there, run
   `"{{PY}}" "{{TOOLS}}/read_pack.py" "{{REFERENCE}}" "{{WORK}}/reference"` and read the
   text files it writes.
3. **Read the resident's file mechanically:**
   `"{{PY}}" "{{TOOLS}}/read_pack.py" "{{RESIDENT}}" "{{WORK}}/pack"`.
   Scanned pages were already read on this computer: their text (names swapped for labels) is
   in the text files. Do not run Tesseract or any OCR yourself, and do not install anything.
   Start with `pack/summary.md`, then read every text file and look at every page image in
   `pack/pages/` (ticks, signatures and blank boxes only show there). The summary's lists of
   reused images, repeated sentences and impossible risk scores are leads to check against
   the documents, not findings in themselves. For copying between residents, also run it on
   the round: `"{{PY}}" "{{TOOLS}}/read_pack.py" "{{ROUND}}" "{{WORK}}/round" --text-only` and read
   `round/summary.md` only. Do not open other residents' page images: it fills the session
   and their files are audited separately.
4. **Work through "How to read the file" in the skill** for every session and every
   comparison it lists. Nothing is skipped because the tool did part of it.
5. **Map the form:** `"{{PY}}" "{{TOOLS}}/inspect_template.py" "{{TEMPLATE}}" "{{WORK}}/template-map.md"`.
6. **Write the words first** into `{{WORK}}/content.md`, section by section in the form's
   order. Before going on, check it against the skill: the support/documentation split, no
   dates in What support has been given / Strengths / Next Steps, no paperwork as a strength,
   documentation actions only in General Notes, General Notes headings in the skill's order,
   no em dashes in our prose, UK English.
7. **Cut the screenshots** with `"{{PY}}" "{{TOOLS}}/crop.py"` into `{{WORK}}/shots/`.
   Plain crops only.
8. **Fill the form** by writing `{{WORK}}/fill.py`, which imports `formkit` from the tools
   folder (read the top of `formkit.py` for how). Use `fill()` to write into the template's
   own blank lines, `choose()` for every YES/NO/N/A, the `*_after()` helpers for everything
   added (they clone the template's own paragraph formatting), and `unfloat()` only for
   the tables that grow with content (Support Delivered and General Notes) plus any other
   you see overlapping the header in the check pages. Do not restyle, retype or
   rebuild anything the template already has: headers, footers, labels, centred underlined
   sub-headings. Run it.
9. **Score it** with the Audit Scoring Framework (in the skill under "Rating the file"):
   write `{{WORK}}/score.json` in the shape shown at the top of `{{TOOLS}}/score.py`, a
   score of 0 to 3 for each of the eight criteria with a one or two sentence reason naming
   the document and date, the three gates with reasons, and an override only if the band
   it gives is clearly wrong (with the reason). Run
   `"{{PY}}" "{{TOOLS}}/score.py" "{{WORK}}/score.json"`. The final band it prints is the
   rating. Also write `{{WORK}}/content.md` so it is complete: the Overall Feedback Form is
   written from it later.
10. **Check it:** `"{{PY}}" "{{TOOLS}}/finish.py" "{{OUTPUT}}" "{{WORK}}"`, then look at
   every page image in `{{WORK}}/check/`. Fix and re-run until every page is right.
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
