---
name: "sea-support-audit"
description: "Audit an SEA/supported housing resident's support file and complete the Support Audit (Form A) Word form in the agreed format, tone and evidence style. Use for each new resident file to audit."
---

# SEA Support Audit – Resident File (Form A)

Audit one resident's support file and fill in the blank Support Audit form
(`Support_Audit_OG.docx`). Use only the form provided. Do not add sections, do not
fabricate, keep it simple and factual.

## Separation — where each finding belongs

**Documents and support are both assessed, fully and on their own terms.** The documents are
a key part of the audit: the checklist columns and General Notes assess them in detail and
that is not being watered down. What this section governs is *separation* — making sure each
finding is written in the part of the form where it is relevant.

- **Document findings** — present, complete, signed, dated, accurate — are assessed in the YES/NO/N/A checklist columns and written up in General Notes.
- **Support findings** — whether relevant support was delivered and whether it moved the resident forward — are assessed in Which goals have been selected, What support has been given, Strengths and Next Steps.

Neither stream is worth less than the other. They are answered in different places, and a
finding written in the wrong section makes the file read inaccurately on both counts: it
inflates one assessment and depresses the other.

## Inputs to get
- The blank form `Support_Audit_OG.docx` (ask the user to attach it if it is not in the chat).
- The resident folder (usually a connected folder on the user's computer, e.g. `...\<Managing Agent>\<Property>\<Resident initials>`). It contains WR-1, WR-2, WR-3, WR-4, WR-5, WR-9, WR-11, WR-12 (reviews), WR-14 (Contact & Support Log), WR-19, and dated session folders (WR-13 session PDF plus evidence files).
- Stage every file into the workspace and read everything before writing.

## How to read the file
1. Text: `pdftotext -layout`. Checkbox ticks and signatures do NOT come through as text and pdftoppm does not render the form fields. Render with PyMuPDF (`pip install pymupdf`), which shows widget ticks; render pages two to an image to review quickly.
2. For every session, extract: date, delivery method, follow-up Yes/No, goal, summary, 'is resident happy' + why, evidenced Yes/No, duration, signatures.
3. Check authenticity every time:
   - Hash embedded images across all PDFs to detect one pasted signature image reused everywhere, including on missed sessions.
   - Sentence-level duplication between sessions, and other residents' names appearing in the text.
   - Statements claiming 'the assessment / support plan records X' — verify X against WR-01 and WR-11.
   - Conditional outcome wording ('where an appointment was arranged', 'if the portal allowed') with no names, dates or references.
   - Saved web pages used as evidence (render offline with JS disabled and network blocked). Check page dates (e.g. events listed after the session date) and whether it is an AI chat (ChatGPT etc.). Never quote or show unrelated personal chat titles.
   - Same evidence image reused for different sessions.
   - **Creation dates:** check PDF metadata, docx core.xml and image EXIF, but **do not report that records appear to have been created after the session date**. Raise it only where it comes with duplicates, copy-and-paste between sessions or residents, or fabrication. Batch-created paperwork on its own is a recording habit, not a finding.
4. Compare: Contact & Support Log v session records (missing sessions, missed sessions logged as support), review due dates v review columns, goals worked on v goals selected on WR-11.

## The support / documentation split

Every finding belongs to one stream or the other, and it must land in the right place on the
form. Getting this wrong is the most common way a file reads as worse than it is.

| | Documentation stream | Support stream |
|---|---|---|
| Question it answers | Is the document present, complete, signed, dated, accurate? | Was relevant support actually delivered, and did it move the resident forward? |
| Where it lands | YES/NO/N/A checklist columns, General Notes | Which goals selected; What support has been given; Strengths; Next Steps |
| Evidence | The document itself | Session records, evidence attached, outcomes reached |

- **A document column is answered on the document alone.** WR-03 unsigned is a NO on WR-03. It says nothing about support quality and does not appear in the support sections.
- **A support finding is never recorded as a document failing.** A goal no session addresses is a support finding, even though it is visible on the WR-11. It belongs in What support has been given and Next Steps, not as a NO against the support plan column.
- **Do not double-count.** One fact marks one column. An unsigned WR-11 is documentation; a generic WR-11 with no action plans is support; write them up separately and once each.
- Where a document gap genuinely prevents support being evidenced at all — no session records provided for the period — record it in both, because it is both.

## Key rules
- If it is not in the file it did not happen. Partly done = NO.
- N/A only where the form offers it and it genuinely does not apply (e.g. reviews not yet due: calculate from move-in date).
- SEA eligibility: at least 5 active support goals at all times.
- Risk Management Plan required for risks of 5 or above; must be specific, operational, non-judgemental.
- Risk score = likelihood × severity, both 1–5. Bands: 1–4 Low, 5–9 Medium, 10–16 High, 20–25 Extremely High/Critical. Flag any score that is not a product of 1–5 × 1–5 (7, 11, 13) as arithmetically impossible.
- **Room checks are welfare checks, not support.** They do not count towards support or the 1-hour per resident per week requirement. Flag when sessions are dominated by room checks/clean-ups.
- Assess against **more than minimal care, support or supervision**: welfare checks, housing management and generic chat do not count; records that cannot be relied on do not evidence support.

## Rating the file

Both streams count towards the score and both are scored on their own merits. A poor
document set holds a file back — Gold is not available unless everything is documented and
evidenced as well as the support being meaningful. What marks a score **further down** is
the support position: whether relevant support was in fact delivered. Documentation findings
alone never take a file to Red.

- **Gold** — everything documented, everything evidenced, and the support is meaningful. All three, or it is not Gold.
- **Green** — relevant support delivered and evidenced against the resident's goals. Documentation sound, with at most minor gaps that do not obscure what was done.
- **Amber** — support delivered but something falls short: goals carried with no work against them, support not reaching the hour, outcomes not evidenced, or documentation poor enough that what was delivered has to be inferred. The default where support is real but the file does not do it justice.
- **Red — critical only.** An extreme lack of support: no sessions completed, no meaningful support delivered, or support that does not align with the risk assessment and support plan. Records that cannot be relied on — duplicated, copied between residents, or fabricated — also sit here, because they evidence nothing.

Applying it:
- Reach the document position and the support position separately, then let the support position decide how far the rating drops.
- Missing or unsigned documents plus a clear record of real support is **Amber**, not Red.
- A complete document set with no meaningful support is **Red**, whatever the paperwork looks like.
- Give the rating in the chat reply (it goes on the Overall Feedback form), not on Form A, and state the support position first in the reason.

## Filling the form (python-docx editing the OG docx)
- Header: MA name as on licence, property address, audit date (DD/MM/YY), resident name, contact number ('Not recorded on file' if blank), move-in date.
- YES/NO/N/A: **highlight the chosen word** (yellow text highlight + bold). Do not shade the whole cell.
- The template's Normal style is green, bold, 20.5pt with a large left indent. Every paragraph/run you add must set left indent 0, first-line indent 0, Aptos, black, explicit bold False, 12pt throughout (body and headings).
- All tables in the template are floating (`w:tblpPr`) and overlap the header when they break across pages. Before saving, remove `tblpPr`/`tblOverlap` and add `w:tblInd` = the old `tblpX` (insert before tblBorders/shd/tblLayout/tblCellMar/tblLook to keep schema order).
- Validate with the docx skill's `validate.py`, convert to PDF with soffice and look at every page.

### Section formats

**Audit Overview:** brief, and an actual overview. The same shape for every file. State how
many files were audited and the **first line of each property address only** — no room
numbers, no postcodes, no per-resident breakdown — then one or two sentences on the support
position. Do not restate ratings, list documents or preview findings here.

> *Eight files were audited across 14 Example Road and 3 Sample Street. Support is being
> delivered weekly and is relevant to residents' goals, with the strongest work around
> employment and independent living; the main gap is that identified needs are not
> consistently carried into the support plan.*

**Which goals have been selected:** list active WR-11 goals (note any completed, with date).

**What support has been given (per goal):** bold heading in Title Case with a colon, then
2–3 sentences of what was actually delivered, naming services, worksheets and evidence (e.g.
'Supported to register with the GP (<GP practice name>)…', 'Completed a "Things That
May Trigger Me" plan…'). Reads human: an outline of how and what support was given, no
dates — dates and evidence detail belong in General Notes. Include themes worked on even if
not selected on WR-11 (e.g. Maintain Personal Hygiene & Housekeeping, Manage Substance
Misuse). Do not count room checks as support. Cover only support delivered; anything not
done or incomplete goes to Next Steps or General Notes.

**Strengths — support only.** Dash bullets ('-' + tab, hanging indent), no dates. Name
support that was actually delivered and what it achieved: practical help given alongside the
resident, referrals made and taken up, goals moved on, the worker responding to what the
resident presented with. Style: 'Use of practical worksheets completed alongside the
resident (including …)', 'Proactive signposting and referrals to … (GP …, CGL …)',
'Hands-on independent living support, including …', 'Employment support that led to …'.
**Never** list paperwork as a strength — documents completed and signed on time is the
baseline, not an achievement.

**Next Steps — support only.** Dash bullets, no dates, 'Title: detail' style. These are what
should happen next *for this resident*: the goal to progress, the referral to make, the skill
to teach, the support to step up or step back. Write them as support actions a worker can
pick up and do, e.g. 'Progress the Driving Licence Goal: book the theory test and sit with
<resident> to complete the booking', 'Refer to Mental Health Support: make the referral
discussed on … and record the outcome', 'Separate Welfare Checks from Support: deliver the
weekly hour as planned support against a named goal rather than room checks', 'Step Back on
Cooking Support: move from cooking alongside to prompting only'.
**Documentation actions — forms to complete, signatures to obtain, fields to fill, reviews
to carry out — go in General Notes against the document they relate to, never here.**

**Missed Support Sessions:** number; warning process N/A/YES/NO; each date in bold with the
reason and whether a warning was issued; note if missed sessions are logged as support or
carry a signature.

**General Notes:** dated and specific, grouped by document with underlined bold headings in
order WR-01, WR-02, WR-03 Fire Safety, WR-05 Missing Person, WR-09 Risk Assessment, WR-11
Support Plan, WR-12 Resident Reviews, WR-13 Support Sessions, WR-14 Contact & Support Log,
Evidence. Each point: what was found → why it matters → what to do. Under each point insert
the supporting screenshot. This is where every documentation finding and documentation action
lives.

## Screenshots
- Crop the relevant part of the rendered page with PyMuPDF (`get_pixmap(dpi=130, clip=Rect)`), find positions with `page.search_for`.
- **Plain screenshots only: no red boxes, no labels or added typography, no borders.** Combine two crops side by side or stacked where a comparison is needed (e.g. duplicated paragraphs, identical reviews, same photo used twice).
- Insert at 14.8 cm width, followed by a small grey italic caption 'Screenshot n – short description' numbered in order of appearance.
- Where a screenshot must come from the user's own PC (file Properties / Document Properties dates), add a red bold placeholder: [Insert screenshot: exactly where to click and what it should show].
- Always screenshot: duplication, blank boxes, missing signatures/dates, signature in the wrong box, invalid or unsupported risk scores, blank review columns, generic RMPs, goals with no action plan, unanswered follow-up questions, signatures on missed sessions, log errors, reused or misdated evidence.

## Tone
Professional, factual, constructive, specific (document code + date). Phrases from the house
style: 'It was identified that…', 'There is little evidence of…', 'Consideration should be
given to…', 'Additional narrative would strengthen…', '…which casts doubt on the
authenticity of the notes', 'Please ensure that all Risk Management Plans are tailored to the
individual…'. No blame, no assumptions beyond the evidence; say what the evidence shows. Flag
data protection where resident documents were uploaded to an external AI tool.

## Deliver
Save as `Support Audit - <Resident Name>.docx`, send it in the chat and write it into the
resident's folder. Reply briefly: rating with the support position first, the main findings,
anything the auditor must check or screenshot themselves.
