# Support Audit desktop run

You are filling in one resident's Support Audit (Form A) for the auditor, exactly as it is
done in chat. Nobody is watching this run and nobody can answer a question: where something
is unclear, take the most reasonable reading, carry on, and say what you assumed in your
final reply.

**The `sea-support-audit` skill is the authority.** Load it first and follow every part of
it. The reference folder (below) holds the auditor's house style, working rules and completed
audits. Where the skill and a reference file disagree, the skill wins.

## This run

- Resident folder: `{{RESIDENT}}`
- Blank form: `{{TEMPLATE}}`
- Reference folder: `{{REFERENCE}}`
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
   Start with `pack/summary.md`, then read every text file and look at every page image in
   `pack/pages/` (ticks, signatures and blank boxes only show there). The summary's lists of
   reused images, repeated sentences and impossible risk scores are leads to check against
   the documents, not findings in themselves.
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
9. **Check it:** `"{{PY}}" "{{TOOLS}}/finish.py" "{{OUTPUT}}" "{{WORK}}"`, then look at
   every page image in `{{WORK}}/check/`. Fix and re-run until every page is right.
10. **Finish** with the reply described below, and write the same text to
    `{{WORK}}/result.md`.

## Boundaries

- Resident information is written only to the work folder and the resident folder. Never
  anywhere else, never into the tools folder.
- Do not touch the original files in the resident folder. Only add the finished form.
- No web access is needed or allowed.

## Final reply

Short, in this order:

```
Rating: <Gold/Green/Amber/Red> - <support position first, then the document position>
Main findings:
- ...
For you to check or screenshot yourself:
- ...
Assumptions made:
- ...
```
