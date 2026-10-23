# sea-audit-machine

Local workbench for resident-level supported housing audit. Drop a resident's
documents in, and it stores them, reads them, and matches each one to a resident
and a document code. Everything stays on this workstation.

**Make this repository private before going further.** It is an application that
ingests special category data about named vulnerable adults. See AGENTS.md.

## Setup

```bash
npm install
cp .env.example .env.local      # then edit both paths
npm run db:migrate
npm run db:seed                 # optional: synthetic sample round
npm run dev
```

Open http://localhost:3000.

`AUDIT_DATA_DIR` and `DATABASE_URL` must both point **outside this repository**.
Resident documents are never stored in the project folder.

## Where things are

| Path | What it is |
|---|---|
| `docs/audit-rules.md` | The rating key, the two streams, risk scoring, thresholds |
| `src/db/schema.ts` | The spine: managing agent → round → resident file |
| `src/lib/extract.ts` | Text, page count, embedded document metadata, image hashes |
| `src/lib/classify.ts` | Which document is this, whose file is it, what date |
| `src/lib/ingest.ts` | Store bytes, then extract and classify |
| `src/app/api/rounds/[roundId]/documents` | The upload endpoint |
| `scripts/seed.ts` | Synthetic data with the defects the checks look for |

## Scripts

```bash
npm run db:generate   # new SQL migration after editing src/db/schema.ts
npm run db:migrate    # apply migrations
npm run db:seed       # reset to synthetic sample data
npm run db:studio     # browse the database
```

## How a document moves through

```
drop → store → extract → classify → [parse fields] → [check] → review → [export]
```

Stages in brackets are not built yet. What works today: dropping a folder stores
every file under `AUDIT_DATA_DIR` addressed by its sha256 (so re-dropping the
same folder creates no duplicates), reads the text and the document's own
created/modified/`lastModifiedBy` metadata, and guesses the document code, the
resident and the date with a confidence score. Anything below the threshold
lands in a review queue on the round page where two dropdowns correct it, and
ticking "remember this spelling" teaches the matcher for next round.

Two things it deliberately does not do:

- **It never sets a rating.** There is no compliance score anywhere in this
  codebase. Ratings are Gold / Green / Amber / Red, entered by hand on the
  resident file with a written reason.
- **It never treats a scan as clean.** A PDF with no text layer is flagged as
  not machine-checked, because every text-based check would otherwise pass on
  it silently.

## Next

1. Field parsers for the risk assessment, support plan and session record — the
   three documents that carry nearly every finding.
2. The check engine: ten arithmetic and comparison rules first, not fifty.
3. Form A export from the Word template.
