# Audit rules — the subset this application implements

Condensed from the Support Audit standards for use inside this repository. Where this file
and the full standards disagree, the full standards win; update this file rather than
coding around it.

## Rating key

Four bands: **Gold, Green, Amber, Red.**

| Band | Meaning |
|---|---|
| **Gold** | Everything documented, everything evidenced, and the support is meaningful. All three, or it is not Gold. |
| **Green** | Relevant support delivered and evidenced against the resident's goals, and the document set is sound with at most minor gaps. |
| **Amber** | Support was delivered but something falls short — goals carried with no work against them, support not reaching the hour, outcomes not evidenced, or a document set weak enough that what was delivered has to be inferred. The default where support is real but the file does not do it justice. |
| **Red** | Critical only. An extreme lack of support: no sessions, no meaningful support, or support that does not align with the risk assessment and support plan. Records that cannot be relied on — duplicated, copied between residents, or fabricated — also sit here, because they evidence nothing. |

Applying it:

- Reach the document position and the support position **separately**, then let the support
  position decide how far the rating drops.
- Missing or unsigned documents plus a clear record of real support is **Amber**, not Red.
- A complete document set with no meaningful support is **Red**, whatever the paperwork
  looks like.
- Documentation findings alone never take a file to Red.
- Every rating carries a short written reason covering both positions.

**The application never computes a rating.** There is no compliance score. `rating` and
`ratingReason` are human-entered fields on `ResidentFile`.

## The two streams

Document findings and support findings are assessed and written up separately, and one fact
is recorded once.

| | Documentation | Support |
|---|---|---|
| Question | Is the document present, complete, signed, dated and accurate? | Was relevant support delivered, and did it move the resident forward? |
| Assessed in | The YES/NO/N/A checklist columns | Which goals selected; What support has been given |
| Written up in | General Notes, grouped by document | Strengths; Next Steps |
| Evidence | The document itself | Session records, evidence attached, outcomes reached |

- A document column is answered on the document alone.
- A support finding is never recorded as a document failing. A goal that no session
  addresses is a support finding even though it is visible on the support plan.
- The one exception: where a document gap prevents support being evidenced at all (no
  session records provided for the period), record it in both, because it is both.

Every `Finding` therefore carries `stream: DOCUMENTATION | SUPPORT`, set by the rule that
fired it. The report exporter routes findings to sections by that field.

## Risk scoring

- Score = **likelihood × severity**, both on a 1–5 scale.
- Bands by number: **1–4 Low, 5–9 Medium, 10–16 High, 20–25 Extremely High / Critical.**
  Ignore cell colours on any matrix image; they do not match the key.
- A **Risk Management Plan is required for any risk scored 5 or above**, and must be
  specific, operational and non-judgemental.
- Any score that is not a product of 1–5 × 1–5 — 7, 11, 13, 14 — is **arithmetically
  impossible on the matrix** and is a finding.

## Thresholds the checks apply

- At least **five active support goals** at all times (eligibility basis). Each needs an
  action plan.
- Minimum **one hour of relevant support per resident per week**.
- **Room checks are welfare checks, not support**, and do not count towards the hour.
- Risk assessment and support plan reviews at **3, 6 and 9 months from move-in**. N/A where
  the resident has not been in long enough; reported only once due.
- A **non-health missed session** requires the warning process to be followed and recorded.
- Exit documentation where the resident has left.

## Evidence discipline in finding text

- UK English, plain and specific, written the way an experienced auditor would write it.
- Nothing fabricated. If something is not in the documents, it is recorded as **not seen in
  the file provided** — which is not the same claim as "did not happen".
- Each finding names the **document, the date, and what is wrong**, with a short "what good
  looks like" example.
- Constructive, not merely critical. The point is that the agent can fix it.

## What the engine does not do

- It does not set, suggest or adjust a rating.
- It does not assert AI authorship. Where it detects duplicated or templated text it quotes
  the matching passages and says they match; the conclusion is the auditor's.
- It does not treat batch-created paperwork as a finding on its own. Records believed to be
  created after the session date are only a finding where there is duplication,
  copy-and-paste between sessions or residents, or fabrication.
