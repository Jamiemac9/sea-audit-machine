"use client"

import Link from "next/link"
import { RatingBadge } from "@/components/workbench/rating-badge"
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
import { AGENT_TOKEN, CLIENT_TOKEN, countReceived, WR_CODES } from "@/lib/documents"
import { formatAuditDate } from "@/lib/format"
import {
  AUDIT_STATUSES,
  rateFile,
  type AuditStatus,
} from "@/lib/rating"
import { useWorkbench } from "@/lib/workbench"

export function CaseloadView() {
  const { files, setStatus, setFileId } = useWorkbench()
  const ratings = files.map((file) => rateFile(file))
  const catchUp = ratings.filter(
    (result) => result.rating === "Amber" || result.rating === "Red",
  ).length

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Seaaudit
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Caseload tracker
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Resident files for {CLIENT_TOKEN}. Managing agent names below are mock
          training data. Reports use {AGENT_TOKEN} for the live agent.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card size="sm" className="shadow-sm ring-foreground/8">
          <CardHeader>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Files in tracker
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{files.length}</p>
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

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Managing agent caseload</CardTitle>
          <CardDescription>
            Open a file reference to audit the WR forms. Status updates stay on
            this workstation.
          </CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Managing agent</TableHead>
              <TableHead>Document deadline</TableHead>
              <TableHead>Documents received</TableHead>
              <TableHead>Audit score</TableHead>
              <TableHead>Audit status</TableHead>
              <TableHead>Caseload progress</TableHead>
              <TableHead>Teams call</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => {
              const result = rateFile(file)
              const received = countReceived(file.received)
              const progress = Math.round((received / WR_CODES.length) * 100)
              const needsCatchUp =
                result.rating === "Amber" || result.rating === "Red"
              return (
                <TableRow key={file.id}>
                  <TableCell>
                    <Link
                      href="/audit"
                      className="font-medium underline-offset-4 hover:underline"
                      onClick={() => setFileId(file.id)}
                    >
                      {file.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{file.managingAgent}</TableCell>
                  <TableCell>{formatAuditDate(file.documentDeadline)}</TableCell>
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
                  <TableCell>
                    <p>{file.teamsCall ? formatAuditDate(file.teamsCall) : "Not scheduled"}</p>
                    {needsCatchUp ? (
                      <p className="text-xs font-medium text-red-700">
                        Remediation catch-up
                      </p>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
