"use client"

import { useState } from "react"
import { AssurancePill } from "@/components/workbench/assurance-pill"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatAuditDate,
  formatScore,
  issuedReports,
  managingAgents,
} from "@/lib/audit"
import { useWorkbench } from "@/lib/workbench"

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${cell.replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ReportsView() {
  const { clientId, clientName, schemeName, projects } = useWorkbench()
  const [notice, setNotice] = useState("")
  const archive = issuedReports.filter((report) => report.clientId === clientId)
  const agentById = new Map(managingAgents.map((agent) => [agent.id, agent.name]))

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Issued work
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Reports archive
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Opinions already issued for {clientName}, plus a working-paper export
          of the current {schemeName.toLowerCase()} scope.
        </p>
      </div>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Current scope</CardTitle>
          <CardDescription>
            {projects.length} project{projects.length === 1 ? "" : "s"} ready to
            export as a local CSV.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" role="status">
            {notice || "Export stays on this workstation."}
          </p>
          <Button
            onClick={() => {
              const filename = `${clientName}-${schemeName}-working-papers.csv`
                .toLowerCase()
                .replaceAll(/[^a-z0-9]+/g, "-")
                .replaceAll(/^-|-$/g, "")
              downloadCsv(filename, [
                [
                  "Project",
                  "Managing agent",
                  "Files",
                  "Score",
                  "Assurance",
                  "Status",
                ],
                ...projects.map((project) => [
                  project.name,
                  agentById.get(project.managingAgentId) ?? project.managingAgentId,
                  String(project.filesAudited),
                  formatScore(project.complianceScore),
                  project.assurance,
                  project.status,
                ]),
              ])
              setNotice(`Prepared ${filename}`)
            }}
          >
            Export working papers
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Issued reports</CardTitle>
          <CardDescription>
            Final opinions held in the local archive.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {archive.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              No issued reports for this client.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Opinion</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {archive.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <p className="font-medium">{report.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.author}
                      </p>
                    </TableCell>
                    <TableCell>{report.scope}</TableCell>
                    <TableCell>{formatAuditDate(`${report.issued}T00:00:00.000Z`)}</TableCell>
                    <TableCell>
                      <AssurancePill rating={report.opinion} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const filename = `${report.title}.csv`
                            .toLowerCase()
                            .replaceAll(/[^a-z0-9]+/g, "-")
                            .replaceAll(/^-|-$/g, "")
                          downloadCsv(`${filename}.csv`, [
                            ["Title", "Scope", "Issued", "Author", "Opinion"],
                            [
                              report.title,
                              report.scope,
                              report.issued,
                              report.author,
                              report.opinion,
                            ],
                          ])
                          setNotice(`Prepared ${filename}.csv`)
                        }}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
