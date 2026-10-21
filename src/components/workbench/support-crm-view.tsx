"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { InlineText } from "@/components/workbench/inline-field"
import { RatingBadge } from "@/components/workbench/rating-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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

const STATUS_COLUMNS: AuditStatus[] = [
  "Files Requested",
  "Docs Received",
  "Awaiting More Info",
  "Audit in Progress",
  "Audit Complete",
]

export function SupportCrmView() {
  const {
    project,
    projects,
    files,
    projectFiles,
    setProjectId,
    updateProject,
    addProject,
    setStatus,
    setFileId,
    updateFile,
    managingAgents,
  } = useWorkbench()
  const [view, setView] = useState<"board" | "table">("board")

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      STATUS_COLUMNS.map((status) => [status, [] as typeof projectFiles]),
    ) as Record<AuditStatus, typeof projectFiles>
    for (const file of projectFiles) {
      map[file.status]?.push(file)
    }
    return map
  }, [projectFiles])

  const ratings = projectFiles.map((file) => rateFile(file))
  const awaiting = projectFiles.filter((f) => f.status === "Awaiting More Info")
    .length
  const catchUp = ratings.filter(
    (result) => result.rating === "Amber" || result.rating === "Red",
  ).length

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Support Audit CRM
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            <InlineText
              value={project.name}
              ariaLabel="Project name"
              onCommit={(name) =>
                updateProject(project.id, { name: name || project.name })
              }
              className="text-2xl font-semibold"
            />
          </h1>
          <div className="mt-2 max-w-xl">
            <InlineText
              value={project.clientLabel}
              ariaLabel="Registered Provider name"
              onCommit={(clientLabel) =>
                updateProject(project.id, {
                  clientLabel: clientLabel || project.clientLabel,
                })
              }
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Monday.com-style caseload board for support audits. Open a resident
            in the Audit Workbench to run the Missing WR Gate and deep extract.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={project.id}
            onValueChange={(value) => {
              if (typeof value === "string") setProjectId(value)
            }}
          >
            <SelectTrigger className="w-56 bg-background" aria-label="Project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={addProject}>
            New project
          </Button>
          <div className="inline-flex rounded-lg border bg-card p-0.5">
            <Button
              size="sm"
              variant={view === "board" ? "default" : "ghost"}
              onClick={() => setView("board")}
            >
              Board
            </Button>
            <Button
              size="sm"
              variant={view === "table" ? "default" : "ghost"}
              onClick={() => setView("table")}
            >
              Table
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Resident files" value={String(projectFiles.length)} />
        <Metric label="Awaiting more info" value={String(awaiting)} />
        <Metric label="Amber / Red" value={String(catchUp)} />
        <Metric label="All caseload files" value={String(files.length)} />
      </div>

      {view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STATUS_COLUMNS.map((status) => (
            <div
              key={status}
              className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40"
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-xs font-semibold tracking-wide uppercase">
                  {status}
                </p>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums">
                  {byStatus[status].length}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {byStatus[status].map((file) => {
                  const result = rateFile(file)
                  return (
                    <div
                      key={file.id}
                      className="rounded-lg border bg-card p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {file.reference}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {file.managingAgent || "MA not set"}
                          </p>
                        </div>
                        <RatingBadge rating={result.rating} />
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {countReceived(file.received)}/{WR_CODES.length} WR ·{" "}
                        {file.reRequestDeadline
                          ? `Re-request ${file.reRequestDeadline}`
                          : `Deadline ${file.documentDeadline}`}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Link
                          href="/workbench"
                          onClick={() => setFileId(file.id)}
                          className="inline-flex h-7 flex-1 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                        >
                          Open workbench
                        </Link>
                      </div>
                      <Select
                        value={file.status}
                        onValueChange={(value) => {
                          if (typeof value === "string") {
                            setStatus(file.id, value as AuditStatus)
                          }
                        }}
                      >
                        <SelectTrigger
                          className="mt-2 h-8 bg-background text-xs"
                          aria-label={`Status for ${file.reference}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AUDIT_STATUSES.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
                {byStatus[status].length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    No files
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="shadow-sm ring-foreground/8">
          <CardHeader>
            <CardTitle>Caseload table</CardTitle>
            <CardDescription>
              Horizontal CRM grid for the active support audit project.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Managing Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>WR pack</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectFiles.map((file) => {
                  const result = rateFile(file)
                  return (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        {file.reference}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={file.managingAgentId || ""}
                          onValueChange={(value) => {
                            if (typeof value !== "string") return
                            const agent = managingAgents.find(
                              (item) => item.id === value,
                            )
                            updateFile(file.id, {
                              managingAgentId: value,
                              managingAgent: agent?.companyName ?? "",
                            })
                          }}
                        >
                          <SelectTrigger className="h-8 w-48 bg-background text-xs">
                            <SelectValue placeholder="Link MA" />
                          </SelectTrigger>
                          <SelectContent>
                            {managingAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{file.status}</TableCell>
                      <TableCell>
                        {countReceived(file.received)}/{WR_CODES.length}
                      </TableCell>
                      <TableCell>
                        {file.reRequestDeadline || file.documentDeadline}
                      </TableCell>
                      <TableCell>
                        <RatingBadge rating={result.rating} />
                      </TableCell>
                      <TableCell>
                        <Link
                          href="/workbench"
                          onClick={() => setFileId(file.id)}
                          className="inline-flex h-7 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                        >
                          Workbench
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card px-4 py-3 shadow-sm ring-foreground/8",
      )}
    >
      <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
