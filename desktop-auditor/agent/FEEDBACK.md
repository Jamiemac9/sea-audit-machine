# Overall Feedback Form run

You are writing the **Overall Feedback Form** for one managing agent's round, after every
resident's Form A has been completed. Nobody is watching this run and nobody can answer a
question: where something is unclear, take the most reasonable reading, carry on, and say
what you assumed in your final reply.

**Everything you can see has been redacted on the auditor's computer.** `[RESIDENT_A]`,
`[RESIDENT_B]` … are the residents, `[PERSON_1]` … anyone else, `[ADDRESS_1]` … addresses,
and so on. Write the placeholder, brackets and all, wherever the form needs that name or
detail. The auditor's computer swaps the real details back in afterwards. Never guess a real
name. A box over a word on a page image is redaction, not a gap.

## This run

- The whole round, redacted: `{{ROUND}}`
- Each resident's completed Form A, score and summary: `{{AUDITS}}/<RESIDENT_X>/`
  (`Support Audit - [RESIDENT_X].docx`, `score-result.json`, `result.md`, `content.md`)
- Blank Overall Feedback Form: `{{TEMPLATE}}`
- Reference folder (redacted): `{{REFERENCE}}`
- Work folder (yours): `{{WORK}}`
- Python: `{{PY}}`   Tools: `{{TOOLS}}`
- Save the finished form as: `{{OUTPUT}}`
- Managing agent: {{MA}}
- Audit date: {{AUDIT_DATE}}
- Audit type: {{AUDIT_TYPE}}
- Auditor's notes: {{NOTES}}

## What the form is for

The managing agent reads this form first, before the feedback call. It turns the individual
audits into themes across the caseload, so the agent knows what is working, what is not,
and exactly what to do about it. It is written to help them improve: constructive, specific
and fair, never a list of faults.

## Order of work

1. Read the reference folder (house style, rules, any completed Overall Feedback Forms):
   `"{{PY}}" "{{TOOLS}}/read_pack.py" "{{REFERENCE}}" "{{WORK}}/reference"`. A completed
   Overall Feedback Form there is the model: match its tone, structure and depth.
2. Read every resident's `content.md`, `result.md` and `score-result.json`, and open their
   Form A. Go back to the round's documents for anything you quote or screenshot:
   `"{{PY}}" "{{TOOLS}}/read_pack.py" "{{ROUND}}" "{{WORK}}/round"`.
3. Find the themes: what is common across files, support first, then documentation.
   Repetition and copied notes across sessions or residents, goals that do not fit
   residents' needs, and goals the support does not deliver against are themes to look for
   first, because they decide whether support is really happening.
4. Map the form: `"{{PY}}" "{{TOOLS}}/inspect_template.py" "{{TEMPLATE}}" "{{WORK}}/template-map.md"`.
5. Write the words into `{{WORK}}/content.md`, then cut screenshots with
   `"{{PY}}" "{{TOOLS}}/crop.py"` into `{{WORK}}/shots/`, then fill the form with a
   `{{WORK}}/fill.py` that uses `formkit` (read the top of `formkit.py`), exactly as for
   Form A: write into the template's own lines, expand its results table as needed, keep
   its headers, footers and layout. Aptos 12.
6. Check: `"{{PY}}" "{{TOOLS}}/finish.py" "{{OUTPUT}}" "{{WORK}}"` and look at every page.
7. Finish with the reply below, and write it to `{{WORK}}/result.md`.

## Structure

**First audit (baseline):**
1. Audit overview: number of files and the first line of each property address only, then
   one or two sentences on the support position across the caseload.
2. Overall rating for the round.
3. About this audit (one short paragraph): what was audited against, that this round sets
   the baseline, and that the next round measures movement against it.
4. Themes, support first and documentation after, grouped across the caseload and not by
   resident. Each theme: a bold dash-bullet title; what was found, with two or three named
   examples from different files, each carrying the document code and date; why it matters
   (the support the resident gets, eligibility or safety); the screenshot with its caption;
   a dash-bullet action beginning "Please ensure…" or "It would be beneficial…"; and the
   file reference column naming the files it draws on.
5. Best practice identified: a row at the head of each half where there is something to
   name, specific and drawn from this agent's own files, so it can be lifted across the rest.
6. Resident ratings: each resident's band only, no "why this score" text.
7. Required actions and timeframes: 4-week and 8-week lists.
8. Escalations only for a data protection, safeguarding or financial matter.
9. What happens next: the follow-up call, and that the next audit opens with progress
   against these actions.

**Follow-up audit:** open with the previous round's actions and their status (Resolved /
Partly actioned / Not actioned, with the evidence seen), then issues that persist (named as
repeated, 4-week deadline by default), then new issues in the theme format above, then
improvements since the last round, ratings, actions, escalations and what happens next.

No "What good looks like" line and no weak/strong example pair: those belong in the
Caseload Report, not here.

## Writing

Slightly conversational, so it flows and explains: what was found, why it matters, what to
do, in sentences that follow on from each other. No fluff and no general statements: every
sentence carries a fact from the files. Where support was practical, call it "practical,
hands-on support" and say exactly what kind. No em dashes in our prose. UK English.

## Final reply

```
Round rating: <band> - <one line>
Themes:
- ...
For you to check or screenshot yourself:
- ...
Assumptions made:
- ...
```
