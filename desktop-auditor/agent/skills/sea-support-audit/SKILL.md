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

## Do we believe support is happening?

This is the key question behind every file, and it is asked before anything is written up.
A file can be complete and still not show real support.

- **Repetition is the common theme to look for.** The same opening, the same "discussed…"
  line, the same goal text or the same outcome repeated across sessions, weeks or residents
  means the record is not describing what happened that day. Sentence-level duplication
  between sessions or residents, identical reviews and the same photo used twice are the
  strongest form of it.
- **Real support reads as specific:** what the resident said, what was done with them,
  what came of it, and what happens next, different from one week to the next.
- Say plainly in General Notes when records do not read as genuine, and why, with the
  screenshot. Where records cannot be relied on, the file is Red (see Rating), because they
  evidence nothing.

## Do the goals fit the person, and does the support match the goals?

Check both, for every file:

1. **Goals against needs.** Compare the needs and risks in the WR-01 and WR-09 with the
   goals selected on the WR-11. A need or risk with no matching goal, or a goal with no
   need behind it, is a finding.
2. **Support against goals.** Compare what the sessions actually delivered with the goals.
   Support that keeps returning to things that are not goals, or goals that no session
   touches, is a finding. The strongest files cross over: the need is identified, the goal
   is set, and the sessions deliver against it.

Mismatches between goals and needs are documentation points (General Notes, WR-11); goals
with no support delivered are support points (What support has been given / Next Steps).

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

The file is scored with the **Audit Scoring Framework**: eight criteria, each scored 0 to 3
(start at 2, the expected standard), weighted to a score out of 100, with three gates. The
app's `score.py` tool does the arithmetic and gives the band; you give each score and the
reason for it. Use the band it gives as the rating, unless the reasoning below clearly calls
for another, in which case set an override with a written reason.

| Criterion | Section | Weight | 3 | 2 (start here) | 1 | 0 |
|---|---|---|---|---|---|---|
| 1. Support delivered (WR-13, WR-14) | Support /50 | 15 | Clearly exceeds the hour, regular sessions | Hour clearly justified, regular sessions | Hour doubtful in places, or gaps | Not evidenced (caps at Amber) |
| 2. Relevance (WR-13 against WR-01, 09, 11) | Support | 15 | Every session links to needs and goals | Mostly linked | Many sessions not linked | No link to needs (caps at Amber) |
| 3. Progress and follow-up (WR-13 follow-up) | Support | 10 | Clear progression, every action revisited | Some progression and follow-up | Repetitive, little follow-up | Stalled, no follow-up |
| 4. Quality of support (WR-13, evidence) | Support | 10 | Personalised, resident's voice throughout, reputable signposting, practical help, evidence trail | Personalised, some signposting or evidence | Generic or discussion only | Generic throughout, nothing practical |
| 5. Needs and risk (WR-01, 09, 10) | Needs & planning /30 | 15 | Detailed and matching, valid scores, plan for every 5+ | Mostly accurate, matrix used | Gaps, all 0s or impossible scores | Missing (caps at Amber) |
| 6. Support plan and reviews (WR-11, 12) | Needs & planning | 15 | 5 active goals, detailed action plans, reviews up to date | 5 goals mostly matching needs, reviews in date | Thin plans, goals not matching needs, or reviews late | Missing (caps at Amber) |
| 7. Licence and Housing Benefit (WR-02, 04, 06, 07) | Tenancy & safety /20 | 10 | Accurate, complete and signed | Minor gap, such as a blank field | Wrong rent, address or details (blocks Gold) | Licence or HB form missing (caps at Amber) |
| 8. Signatures and safety (whole file, WR-03, 05, 19, 21, 22) | Tenancy & safety | 10 | All signed and complete | 1 or 2 isolated gaps | Missing across several documents | No resident signatures anywhere (caps at Amber) |

Gates: **Red gate** (support not happening or records that cannot be relied on: no sessions,
no meaningful support, duplicated, copied or fabricated records) makes the file Red.
**Critical document missing** caps it at Amber. **Critical document inaccurate** blocks Gold.
Bands: Gold at 85 or above with criteria 1 to 4 all at 2 or more and criterion 7 at 2 or
more; Amber below 60, or any cap; Green otherwise. Repetition and copied notes (see "Do we
believe support is happening?") bring criteria 1 to 4 down, and where they mean the records
cannot be relied on, set the Red gate.

The reasoning behind the bands still holds:

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
- Each criterion's reason is one or two plain sentences naming what you saw (document and date), so the scoring tab reads as a breakdown someone can follow.

## Filling the form (python-docx editing the OG docx)
- Header: MA name as on licence, property address, audit date (DD/MM/YY), resident name, contact number ('Not recorded on file' if blank), move-in date.
- YES/NO/N/A: **highlight the chosen word** (yellow text highlight only, not bold). Do not shade the whole cell.
- The template's Normal style is green, bold, 20.5pt with a large left indent. Every paragraph/run you add must set left indent 0, first-line indent 0, Aptos, black, explicit bold False, 12pt throughout (body and headings).
- All tables in the template are floating (`w:tblpPr`) and overlap the header when they break across pages. Unfloat only the two tables that grow, What support has been given and General Notes; unfloating every table displaces the page. For those two, remove `tblpPr`/`tblOverlap` and add `w:tblInd` = the old `tblpX` (insert before tblBorders/shd/tblLayout/tblCellMar/tblLook to keep schema order).
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
dates — dates and evidence detail belong in General Notes.

Write it slightly conversationally, so it flows and explains: what the worker did with the
resident, how, and what came of it, as one connected account rather than a list of
activities. No fluff and no general statements: every sentence says something that
happened. Where the support was practical, say so in those words, "practical, hands-on
support", and say exactly what kind: e.g. "Practical, hands-on support to set up his
Universal Credit journal, sitting with him to complete the first entries and showing him
how to check for messages", "practical, hands-on support with shopping and cooking on a
budget, going to the supermarket together and cooking a meal from the shopping list". Where
support was discussion only, say that plainly rather than dressing it up. Include themes worked on even if
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
Professional, factual, constructive, specific (document code + date). Slightly
conversational: the auditor explains what was found and why it matters, in sentences that
follow on from each other, rather than clipped bullet-style statements. No fluff, no padding,
no general praise or criticism without the evidence behind it. Phrases from the house
style: 'It was identified that…', 'There is little evidence of…', 'Consideration should be
given to…', 'Additional narrative would strengthen…', '…which casts doubt on the
authenticity of the notes', 'Please ensure that all Risk Management Plans are tailored to the
individual…'. No blame, no assumptions beyond the evidence; say what the evidence shows. Flag
data protection where resident documents were uploaded to an external AI tool.

## Deliver
Save as `Support Audit - <Resident Name>.docx`, send it in the chat and write it into the
resident's folder. Reply briefly: rating with the support position first, the main findings,
anything the auditor must check or screenshot themselves.
