import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { reclassifyDocument } from "@/lib/actions"
import { WR_CODES, formatCount } from "@/lib/audit"

type QueueDocument = {
  id: string
  originalName: string
  wrCode: string | null
  residentFileId: string | null
  confidence: number | null
  needsOcr: boolean
}

/**
 * Everything the classifier was not confident enough to accept. Correcting a
 * row is two dropdowns and a button, and ticking "remember this spelling"
 * teaches the matcher so the same misfiling classifies itself next round.
 */
export function ReviewQueue({
  roundId,
  documents,
  residents,
}: {
  roundId: string
  documents: QueueDocument[]
  residents: { id: string; residentName: string }[]
}) {
  return (
    <Card className="shadow-sm ring-foreground/8">
      <CardHeader className="border-b">
        <CardTitle>
          Review queue — {formatCount(documents.length)} to confirm
        </CardTitle>
        <CardDescription>
          These were read but not matched confidently to a resident or a
          document code. Nothing is checked until it is filed against a
          resident.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y pt-0">
        {documents.map((doc) => (
          <form
            key={doc.id}
            action={reclassifyDocument}
            className="flex flex-wrap items-end gap-3 py-4"
          >
            <input type="hidden" name="documentId" value={doc.id} />
            <input type="hidden" name="roundId" value={roundId} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={doc.originalName}>
                {doc.originalName}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {doc.confidence != null
                  ? `Confidence ${Math.round(doc.confidence * 100)}%`
                  : "Not classified"}
                {doc.needsOcr ? " · no text layer, not machine-checked" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`resident-${doc.id}`}
                className="text-xs font-medium"
              >
                Resident
              </label>
              <select
                id={`resident-${doc.id}`}
                name="residentFileId"
                defaultValue={doc.residentFileId ?? ""}
                className="h-9 w-52 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Unassigned</option>
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.residentName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`wr-${doc.id}`} className="text-xs font-medium">
                Document
              </label>
              <select
                id={`wr-${doc.id}`}
                name="wrCode"
                defaultValue={doc.wrCode ?? ""}
                className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Unknown</option>
                {WR_CODES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
              <input type="checkbox" name="learnAlias" className="size-4" />
              Remember this spelling
            </label>

            <Button type="submit" size="sm" variant="outline">
              Confirm
            </Button>
          </form>
        ))}
      </CardContent>
    </Card>
  )
}
