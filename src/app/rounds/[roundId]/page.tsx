import type { Metadata } from "next"
import { connection } from "next/server"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DropZone } from "@/components/workbench/drop-zone"
import { RatingPill } from "@/components/workbench/rating-pill"
import { ReviewQueue } from "@/components/workbench/review-queue"
import { createResidentFile, reprocessRound } from "@/lib/actions"
import {
  ROUND_FORMAT_LABEL,
  formatAuditDate,
  formatCount,
  type RoundFormat,
} from "@/lib/audit"
import { getRoundDetail } from "@/lib/queries"

export const metadata: Metadata = { title: "Round" }

// Reads the local database on every request, so it is a blocking route rather
// than a prerendered one. There is nothing here worth caching: the whole point
// is to show what is in the file right now.
export const instant = false

export default async function RoundPage({
  params,
}: {
  params: Promise<{ roundId: string }>
}) {
  // Marks this render as request-time. Without it the page is statically
  // prerendered and the database contents are baked into the build.
  await connection()

  const { roundId } = await params
  const detail = await getRoundDetail(roundId)
  if (!detail) notFound()

  const scans = detail.documents.filter((doc) => doc.needsOcr)
  const failed = detail.documents.filter((doc) => doc.extractionState === "FAILED")

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← All rounds
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {detail.agent.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.round.label} ·{" "}
          {ROUND_FORMAT_LABEL[detail.round.format as RoundFormat] ??
            detail.round.format}{" "}
          · audited {formatAuditDate(detail.round.auditDate)} ·{" "}
          {formatCount(detail.documents.length)} documents
        </p>
      </div>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Add documents</CardTitle>
          <CardDescription>
            Add the resident files first, so dropped documents have someone to
            be matched to.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <DropZone roundId={roundId} />
        </CardContent>
      </Card>

      {scans.length > 0 || failed.length > 0 ? (
        <Card className="border-amber-600/30 bg-amber-50/50 shadow-sm">
          <CardContent className="flex flex-col gap-2 py-4 text-sm">
            {scans.length > 0 ? (
              <p className="flex items-start gap-2">
                <ScanLine className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <span>
                  <strong>{formatCount(scans.length)} document(s) have no
                  text layer</strong> and have not been machine-checked. A scan
                  passes every text check silently, so these need reading by
                  eye until OCR is added.
                </span>
              </p>
            ) : null}
            {failed.length > 0 ? (
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <span>
                  {formatCount(failed.length)} document(s) could not be read:{" "}
                  {failed
                    .slice(0, 3)
                    .map((doc) => doc.originalName)
                    .join(", ")}
                  .
                </span>
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {detail.unclassified.length > 0 ? (
        <ReviewQueue
          roundId={roundId}
          documents={detail.unclassified.map((doc) => ({
            id: doc.id,
            originalName: doc.originalName,
            wrCode: doc.wrCode,
            residentFileId: doc.residentFileId,
            confidence: doc.confidence,
            needsOcr: doc.needsOcr,
          }))}
          residents={detail.residentFiles.map((file) => ({
            id: file.id,
            residentName: file.residentName,
          }))}
        />
      ) : null}

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Resident files</CardTitle>
          <CardDescription>
            Ratings are entered by hand on each file, with a reason. Nothing
            here computes one.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {detail.residentFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No resident files yet. Add the first one below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Move-in</TableHead>
                  <TableHead className="text-right">Documents</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.residentFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <Link
                        href={`/resident-files/${file.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {file.residentName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[file.propertyLine1, file.roomRef]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatAuditDate(file.moveInDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCount(file.documentCount)}
                    </TableCell>
                    <TableCell>
                      <RatingPill rating={file.rating} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <form
            action={createResidentFile}
            className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
          >
            <input type="hidden" name="roundId" value={roundId} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resident-name">Resident</Label>
              <Input
                id="resident-name"
                name="residentName"
                required
                className="w-56"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="property">Property</Label>
              <Input id="property" name="propertyLine1" className="w-56" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="room">Room</Label>
              <Input id="room" name="roomRef" className="w-28" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="move-in">Move-in date</Label>
              <Input
                id="move-in"
                name="moveInDate"
                type="date"
                className="w-44"
              />
            </div>
            <Button type="submit" variant="outline">
              Add resident file
            </Button>
          </form>
        </CardContent>
      </Card>

      <form action={reprocessRound}>
        <input type="hidden" name="roundId" value={roundId} />
        <Button type="submit" variant="outline">
          Re-read and re-match every document
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          Run this after adding resident files or correcting a spelling. Nothing
          is re-uploaded.
        </p>
      </form>
    </div>
  )
}
