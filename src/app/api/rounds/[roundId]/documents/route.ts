import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { rounds } from "@/db/schema"
import { ingestFile, type IngestOutcome } from "@/lib/ingest"


export async function POST(
  request: Request,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params

  const [round] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1)

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 })
  }

  const form = await request.formData()
  const files = form.getAll("files").filter((item): item is File => item instanceof File)

  if (files.length === 0) {
    return NextResponse.json({ error: "No files received" }, { status: 400 })
  }

  const results: IngestOutcome[] = []
  // Sequential on purpose: extraction is CPU-bound and this runs on one
  // workstation. Parallelising it makes a large drop less responsive, not more.
  for (const file of files) {
    results.push(await ingestFile(roundId, file))
  }

  return NextResponse.json({
    stored: results.filter((r) => r.status === "stored").length,
    duplicates: results.filter((r) => r.status === "duplicate").length,
    failed: results.filter((r) => r.status === "failed").length,
    needsReview: results.filter((r) => r.needsReview).length,
    results,
  })
}
