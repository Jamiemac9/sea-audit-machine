"use client"

import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import { Loader2, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCount } from "@/lib/audit"
import { cn } from "cn"

type Summary = {
  stored: number
  duplicates: number
  failed: number
  needsReview: number
  results: { originalName: string; status: string; error?: string }[]
}

export function DropZone({ roundId }: { roundId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setBusy(true)
      setError(null)
      setSummary(null)
      setProgress(`Reading ${formatCount(files.length)} file${files.length === 1 ? "" : "s"}…`)

      try {
        // Batched so a dropped folder of several hundred documents does not
        // become one request that times out halfway through.
        const batchSize = 20
        const totals: Summary = {
          stored: 0,
          duplicates: 0,
          failed: 0,
          needsReview: 0,
          results: [],
        }

        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize)
          setProgress(
            `Storing and reading ${formatCount(Math.min(i + batch.length, files.length))} of ${formatCount(files.length)}…`
          )
          const body = new FormData()
          for (const file of batch) body.append("files", file)

          const response = await fetch(`/api/rounds/${roundId}/documents`, {
            method: "POST",
            body,
          })
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}))
            throw new Error(payload.error ?? `Upload failed (${response.status})`)
          }
          const result: Summary = await response.json()
          totals.stored += result.stored
          totals.duplicates += result.duplicates
          totals.failed += result.failed
          totals.needsReview += result.needsReview
          totals.results.push(...result.results)
        }

        setSummary(totals)
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Upload failed")
      } finally {
        setBusy(false)
        setProgress(null)
      }
    },
    [roundId, router]
  )

  /** Dropping a folder gives directory entries, not files — walk them. */
  const filesFromDataTransfer = useCallback(async (transfer: DataTransfer) => {
    const entries = Array.from(transfer.items)
      .map((item) => item.webkitGetAsEntry?.())
      .filter(Boolean) as FileSystemEntry[]

    if (entries.length === 0) return Array.from(transfer.files)

    const out: File[] = []
    const walk = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
          (entry as FileSystemFileEntry).file(resolve, reject)
        )
        out.push(file)
        return
      }
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      // readEntries returns at most 100 at a time, so it is called until empty.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          reader.readEntries(resolve, reject)
        )
        if (batch.length === 0) break
        for (const child of batch) await walk(child)
      }
    }
    for (const entry of entries) await walk(entry)
    return out
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (event) => {
          event.preventDefault()
          setDragging(false)
          if (busy) return
          const files = await filesFromDataTransfer(event.dataTransfer)
          await upload(files)
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-foreground/20"
        )}
      >
        {busy ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <UploadCloud className="size-6 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {busy ? progress : "Drop a resident folder here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Files are stored outside this project, read for text and document
            properties, then matched to a resident and a document code.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ""
            await upload(files)
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {summary ? (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm">
          <p className="font-medium">
            {formatCount(summary.stored)} stored
            {summary.duplicates > 0
              ? `, ${formatCount(summary.duplicates)} already in this round`
              : ""}
            {summary.failed > 0
              ? `, ${formatCount(summary.failed)} could not be read`
              : ""}
            .
          </p>
          {summary.needsReview > 0 ? (
            <p className="mt-1 text-muted-foreground">
              {formatCount(summary.needsReview)} need a human to confirm the
              resident or the document code — see the review queue below.
            </p>
          ) : null}
          {summary.results
            .filter((result) => result.status === "failed")
            .slice(0, 5)
            .map((result) => (
              <p key={result.originalName} className="mt-1 text-destructive">
                {result.originalName}: {result.error}
              </p>
            ))}
        </div>
      ) : null}
    </div>
  )
}
