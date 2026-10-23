# sea-audit-machine — house rules

Read `docs/audit-rules.md` before writing anything that touches ratings, risk scores,
findings or report output. These rules are not generic housing-compliance conventions and
guessing at them produces work that has to be thrown away.

**The spine is ManagingAgent → Round → ResidentFile.** The resident file is the unit of
assurance; the round is the deliverable. Never reintroduce a client/scheme/project
hierarchy, and never represent resident files as a count on a parent record — almost every
check is a statement about one resident's file, or a comparison between two.

**Ratings are Gold / Green / Amber / Red and are set by a human.** Never compute, derive or
suggest a rating from a score, a percentage, or a count of findings. There is no compliance
percentage in this application. A rating always carries a written reason.

**The check engine produces findings, never ratings.** A finding names the document, the
date, what is wrong, and what good looks like. It is `PROPOSED` until a human confirms it.

**Findings are tagged DOCUMENTATION or SUPPORT and the two are never merged.** They are
written up in different sections of the report, and one fact is recorded once, in one
stream only.

**Resident data never enters this repository.** No real names, addresses, document text or
files in fixtures, tests, seeds, commit messages or comments. Document bytes are written to
`AUDIT_DATA_DIR`, which is outside the repo. Seed and test data is synthetic only — see
`scripts/seed.ts`.

**No day-job material.** This repository is public-facing work product. Do not name the
employing provider, its managing agents, its rounds or its residents anywhere in the code,
comments, UI copy or commit messages. The `WR-` document codes are kept as a configurable
default scheme and are not attributed.

**UK English throughout**, in code, comments, UI copy and report output.

Stack: Next.js (App Router) + Drizzle + SQLite (better-sqlite3). Document parsing is
Node-only; do not add a Python process. Keep route handlers thin and put logic in
`src/lib/`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
