import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RatingPill } from "@/components/workbench/rating-pill"
import { setRating } from "@/lib/actions"
import {
  MINIMUM_ACTIVE_GOALS,
  RATINGS,
  RATING_DEFINITION,
  RATING_LABEL,
  STREAM_LABEL,
  formatAuditDate,
  formatBytes,
  formatCount,
  isPossibleRiskScore,
  riskBand,
  wrCodeName,
  type Stream,
} from "@/lib/audit"
import { getResidentFile } from "@/lib/queries"

export const metadata: Metadata = { title: "Resident file" }

// Reads the local database on every request, so it is a blocking route rather
// than a prerendered one. There is nothing here worth caching: the whole point
// is to show what is in the file right now.
export const instant = false

export default async function ResidentFilePage({
  params,
}: {
  params: Promise<{ residentFileId: string }>
}) {
  const { residentFileId } = await params
  const detail = await getResidentFile(residentFileId)
  if (!detail) notFound()

  const activeGoals = detail.goals.filter((goal) => goal.active)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <Link
          href={`/rounds/${detail.round.id}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← {detail.agent.name}, {detail.round.label}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {detail.file.residentName}
          </h1>
          <RatingPill rating={detail.file.rating} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {[detail.file.propertyLine1, detail.file.roomRef]
            .filter(Boolean)
            .join(", ") || "No property recorded"}{" "}
          · moved in {formatAuditDate(detail.file.moveInDate)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm ring-foreground/8">
          <CardHeader className="border-b">
            <CardTitle>Risks</CardTitle>
            <CardDescription>
              Score is likelihood × severity on a 1–5 matrix. A Risk Management
              Plan is required at 5 or above.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {detail.risks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No risks parsed from this file yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead className="text-right">L × S</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Band</TableHead>
                    <TableHead>Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.risks.map((risk) => {
                    const impossible =
                      risk.score != null && !isPossibleRiskScore(risk.score)
                    return (
                      <TableRow key={risk.id}>
                        <TableCell className="font-medium">{risk.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {risk.likelihood ?? "—"} × {risk.severity ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={impossible ? "text-destructive font-medium" : ""}>
                            {risk.score ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {impossible
                            ? "Impossible on the matrix"
                            : (riskBand(risk.score) ?? "—")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {risk.hasPlan ? "Yes" : "No"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm ring-foreground/8">
          <CardHeader className="border-b">
            <CardTitle>
              Goals — {formatCount(activeGoals.length)} active
            </CardTitle>
            <CardDescription>
              At least {MINIMUM_ACTIVE_GOALS} active goals are required at all
              times, each with an action plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {detail.goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No goals parsed from this file yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {detail.goals.map((goal) => (
                  <li key={goal.id}>
                    <p className="text-sm font-medium">{goal.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {goal.actionPlanText ?? "No action plan recorded."}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {detail.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents matched to this resident yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Document date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last saved by</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      {doc.wrCode ?? "—"}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {wrCodeName(doc.wrCode) ?? ""}
                      </span>
                    </TableCell>
                    <TableCell
                      className="max-w-[18rem] truncate text-muted-foreground"
                      title={doc.originalName}
                    >
                      {doc.originalName}
                      {doc.needsOcr ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900">
                          not machine-checked
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatAuditDate(doc.documentDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatAuditDate(doc.docCreatedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.lastModifiedBy ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatBytes(doc.byteSize)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Findings</CardTitle>
          <CardDescription>
            Proposed by the checks, confirmed by you. Documentation and support
            findings are kept apart and written up in different sections.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {detail.findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No findings yet. The check engine is the next piece of work — see
              docs/audit-rules.md.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {detail.findings.map((finding) => (
                <li key={finding.id}>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {STREAM_LABEL[finding.stream as Stream] ?? finding.stream} ·{" "}
                    {finding.documentRef}
                  </p>
                  <p className="mt-1 text-sm">{finding.whatIsWrong}</p>
                  {finding.whatGoodLooksLike ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      What good looks like: {finding.whatGoodLooksLike}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Rating</CardTitle>
          <CardDescription>
            Reach the document position and the support position separately,
            then let the support position decide how far the rating drops.
            Documentation findings alone never take a file to Red.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={setRating} className="flex flex-col gap-4">
            <input type="hidden" name="residentFileId" value={residentFileId} />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Band</legend>
              {RATINGS.map((rating) => (
                <label
                  key={rating}
                  className="flex items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="rating"
                    value={rating}
                    defaultChecked={detail.file.rating === rating}
                    className="mt-1 size-4"
                  />
                  <span>
                    <span className="font-medium">{RATING_LABEL[rating]}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {RATING_DEFINITION[rating]}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rating-reason">
                Reason — the support position, then the document position
              </Label>
              <Textarea
                id="rating-reason"
                name="ratingReason"
                rows={4}
                defaultValue={detail.file.ratingReason ?? ""}
              />
            </div>
            <div>
              <Button type="submit">Save rating</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
