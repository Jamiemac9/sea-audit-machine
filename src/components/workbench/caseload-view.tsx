"use client"

import Link from "next/link"
import { Fragment, useState } from "react"
import { InlineText } from "@/components/workbench/inline-field"
import { RatingBadge } from "@/components/workbench/rating-badge"
import { RubricEditor } from "@/components/workbench/rubric-editor"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { countReceived, WR_CODES } from "@/lib/documents"
import { AUDIT_STATUSES, rateFile, type AuditStatus } from "@/lib/rating"
import { useWorkbench } from "@/lib/workbench"
import { cn } from "cn"

async function readExtract(file: File) {
  const textual =
    file.type.startsWith("text") || /\.(txt|md|csv|json)$/i.test(file.name)
  if (!textual) {
    return `Local upload: ${file.name}\nThe original file stays on this workstation. Paste or correct the extract here.`
  }
  return file.text()
}

export function CaseloadView() {
  const {
    project,
    projects,
    projectFiles,
    setProjectId,
    updateProject,
    addProject,
    addUploadedFiles,
    updateFile,
    setStatus,
    setFileId,
    reassignFile,
    removeFile,
  } = useWorkbench()
  const [dragOver, setDragOver] = useState(false)
  const [openFileId, setOpenFileId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const ratings = projectFiles.map((file) => rateFile(file))
  const catchUp = ratings.filter(
    (result) => result.rating === "Amber" || result.rating === "Red",
  ).length

  async function ingest(list: File[]) {
    if (list.length === 0) return
    const uploads = await Promise.all(
      list.map(async (file) => ({ name: file.name, text: await readExtract(file) })),
    )
    addUploadedFiles(project.id, uploads)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Audit project
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            <InlineText
              value={project.name}
              ariaLabel="Project name"
              onCommit={(name) => updateProject(project.id, { name: name || project.name })}
              className="text-2xl font-semibold"
            />
          </h1>
          <div className="mt-2 max-w-xl">
            <InlineText
              value={project.clientLabel}
              ariaLabel="Project client label"
              onCommit={(clientLabel) =>
                updateProject(project.id, {
                  clientLabel: clientLabel || project.clientLabel,
                })
              }
            />
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Click a cell to edit it here. Drop resident files onto the project,
            or upload them. Chantry Housing and Best Choice Housing are mock
            training agents.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            aria-label="Audit project"
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm sm:w-64"
            value={project.id}
            onChange={(event) => setProjectId(event.target.value)}
          >
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={addProject}>
            New project
          </Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card size="sm" className="shadow-sm ring-foreground/8">
          <CardHeader>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Files in this project
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {projectFiles.length}
            </p>
          </CardHeader>
        </Card>
        <Card size="sm" className="shadow-sm ring-foreground/8">
          <CardHeader>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Amber or Red
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{catchUp}</p>
            <CardDescription>Remediation catch-up calls are flagged.</CardDescription>
          </CardHeader>
        </Card>
        <Card size="sm" className="shadow-sm ring-foreground/8">
          <CardHeader>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Document suite
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {WR_CODES.length}
            </p>
            <CardDescription>WR-01 through WR-22 on every file.</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center",
          dragOver ? "border-primary bg-muted" : "border-border bg-card",
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          void ingest(Array.from(event.dataTransfer.files))
        }}
      >
        <span className="text-sm font-medium">
          Drop resident files here, or choose them
        </span>
        <span className="mt-1 max-w-lg text-sm text-muted-foreground">
          Text files become the local extract. Other files stay on this
          workstation and open with a placeholder you can edit.
        </span>
        <input
          id="resident-upload"
          aria-label="Upload resident files"
          className="mt-3 block text-sm"
          type="file"
          multiple
          onChange={(event) => {
            const list = Array.from(event.target.files ?? [])
            event.target.value = ""
            void ingest(list)
          }}
        />
      </label>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Resident files</CardTitle>
          <CardDescription>
            Edit the record in the row. Open the rubric to score a question and
            write the observation without leaving this project.
          </CardDescription>
        </CardHeader>
        {projectFiles.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            This project has no resident files yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Managing agent</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Teams call</TableHead>
                <TableHead>Observation</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectFiles.map((file) => {
                const result = rateFile(file)
                const received = countReceived(file.received)
                const progress = Math.round((received / WR_CODES.length) * 100)
                const needsCatchUp =
                  result.rating === "Amber" || result.rating === "Red"
                const open = openFileId === file.id
                return (
                  <Fragment key={file.id}>
                    <TableRow>
                      <TableCell className="min-w-36">
                        <InlineText
                          value={file.reference}
                          ariaLabel={`Reference for ${file.reference}`}
                          onCommit={(reference) =>
                            updateFile(file.id, {
                              reference: reference || file.reference,
                            })
                          }
                        />
                        <Link
                          href="/audit"
                          className="px-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                          onClick={() => setFileId(file.id)}
                        >
                          Review
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-40">
                        <InlineText
                          value={file.managingAgent}
                          placeholder="Add managing agent"
                          ariaLabel={`Managing agent for ${file.reference}`}
                          onCommit={(managingAgent) =>
                            updateFile(file.id, { managingAgent })
                          }
                        />
                      </TableCell>
                      <TableCell className="min-w-36">
                        <InlineText
                          type="date"
                          value={file.documentDeadline}
                          ariaLabel={`Document deadline for ${file.reference}`}
                          onCommit={(documentDeadline) =>
                            updateFile(file.id, {
                              documentDeadline:
                                documentDeadline || file.documentDeadline,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {received} / {WR_CODES.length}
                      </TableCell>
                      <TableCell>
                        <RatingBadge rating={result.rating} />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={file.status}
                          onValueChange={(value) => {
                            if (typeof value === "string") {
                              setStatus(file.id, value as AuditStatus)
                            }
                          }}
                        >
                          <SelectTrigger
                            className="w-44 bg-background"
                            aria-label={`Audit status for ${file.reference}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AUDIT_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-28 items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-primary"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-36">
                        <InlineText
                          type="date"
                          value={file.teamsCall ?? ""}
                          placeholder="Add call date"
                          ariaLabel={`Teams call for ${file.reference}`}
                          onCommit={(teamsCall) =>
                            updateFile(file.id, { teamsCall: teamsCall || null })
                          }
                        />
                        {needsCatchUp ? (
                          <p className="px-1 text-xs font-medium text-red-700">
                            Remediation catch-up
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="min-w-56">
                        <InlineText
                          value={file.observation}
                          placeholder="Add an observation"
                          ariaLabel={`Observation for ${file.reference}`}
                          onCommit={(observation) =>
                            updateFile(file.id, { observation })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          aria-label={`Reassign ${file.reference}`}
                          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                          value={file.projectId}
                          onChange={(event) =>
                            reassignFile(file.id, event.target.value)
                          }
                        >
                          {projects.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-expanded={open}
                            onClick={() =>
                              setOpenFileId(open ? null : file.id)
                            }
                          >
                            {open ? "Hide rubric" : "Rubric"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (pendingDelete === file.id) {
                                removeFile(file.id)
                                setPendingDelete(null)
                                if (openFileId === file.id) setOpenFileId(null)
                              } else {
                                setPendingDelete(file.id)
                              }
                            }}
                          >
                            {pendingDelete === file.id ? "Confirm remove" : "Remove"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow>
                        <TableCell colSpan={11}>
                          <RubricEditor fileId={file.id} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
