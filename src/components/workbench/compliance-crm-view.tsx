"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, FileStack } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
  BIG8_LABELS,
  big8Keys,
  certForKey,
  groupPropertiesByRegion,
  overallCompliance,
  statusTone,
  type Big8CertKey,
  type CertStatus,
  type PropertyComplianceRow,
} from "@/lib/propertyCompliance"
import { useWorkbench } from "@/lib/workbench"
import { cn } from "cn"

type TopTab = "main" | "big8" | "files" | "charts"

export function ComplianceCrmView() {
  const { properties, managingAgents } = useWorkbench()
  const [tab, setTab] = useState<TopTab>("main")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const groups = useMemo(
    () => groupPropertiesByRegion(properties),
    [properties],
  )

  const regional = useMemo(() => {
    return groups.map(([region, rows]) => {
      const scores = rows.map((row) => overallCompliance(row))
      const compliant = scores.filter((s) => s.status === "COMPLIANT").length
      const avg = Math.round(
        scores.reduce((sum, s) => sum + s.percentage, 0) / Math.max(rows.length, 1),
      )
      return { region, count: rows.length, compliant, avg }
    })
  }, [groups])

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Property Compliance CRM
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Big 8 Property Compliance Board
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Separate Monday.com-style board for Gas, Fire Alarm, EML, FRA,
          Legionella, PAT, Asbestos, and Damp & Mould — independent from Support
          Audit CRM.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
        {(
          [
            ["main", "Main Table"],
            ["big8", "Big 8 Reporting"],
            ["files", "Files Gallery"],
            ["charts", "Regional Charts"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "charts" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {regional.map((item) => (
            <Card key={item.region} className="shadow-sm ring-foreground/8">
              <CardHeader>
                <CardTitle className="text-base">{item.region}</CardTitle>
                <CardDescription>
                  {item.compliant}/{item.count} compliant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      item.avg >= 90 ? "bg-emerald-500" : "bg-red-500",
                    )}
                    style={{ width: `${item.avg}%` }}
                  />
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {item.avg}%
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "files" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card key={property.id} className="shadow-sm ring-foreground/8">
              <CardHeader>
                <CardTitle className="text-base">{property.address}</CardTitle>
                <CardDescription>
                  Documents gallery · +{property.documentCount}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-xs">
                {big8Keys().map((key) => {
                  const cert = certForKey(property, key)
                  if (!cert.uploadName) return null
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1"
                    >
                      <FileStack className="size-3" />
                      {cert.uploadName}
                    </span>
                  )
                })}
                {property.insuranceUpload ? (
                  <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1">
                    <FileStack className="size-3" />
                    {property.insuranceUpload}
                  </span>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {(tab === "main" || tab === "big8") &&
        groups.map(([region, rows]) => {
          const open = !collapsed[region]
          return (
            <div key={region} className="rounded-xl border bg-card shadow-sm">
              <button
                type="button"
                className="flex w-full items-center gap-2 border-b px-4 py-3 text-left hover:bg-muted/40"
                onClick={() =>
                  setCollapsed((current) => ({
                    ...current,
                    [region]: !current[region],
                  }))
                }
              >
                {open ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                <span className="font-semibold">{region}</span>
                <span className="text-xs text-muted-foreground">
                  {rows.length} properties
                </span>
                <RegionSummaryBar rows={rows} />
              </button>
              {open ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 z-10 min-w-56 bg-card">
                          Property Address / Item
                        </TableHead>
                        <TableHead className="min-w-40">
                          Provider / Managing Agent
                        </TableHead>
                        <TableHead className="min-w-40">
                          Point of Contact for Access
                        </TableHead>
                        {tab === "big8" || tab === "main"
                          ? big8Keys().flatMap((key) =>
                              headerCellsFor(key, tab),
                            )
                          : null}
                        <TableHead className="min-w-40">
                          Overall Compliance
                        </TableHead>
                        <TableHead className="min-w-28">Documents</TableHead>
                        <TableHead className="min-w-32">Insurance</TableHead>
                        <TableHead className="min-w-36">
                          Next Inspection
                        </TableHead>
                        <TableHead className="min-w-32">Lease / SLA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((property) => {
                        const overall = overallCompliance(property)
                        const agent = managingAgents.find(
                          (item) => item.id === property.managingAgentId,
                        )
                        return (
                          <TableRow key={property.id}>
                            <TableCell className="sticky left-0 z-10 bg-card">
                              <p className="font-medium">{property.address}</p>
                              {property.notes ? (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  💬 {property.notes}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              {agent?.companyName ?? property.managingAgentId}
                            </TableCell>
                            <TableCell className="text-xs">
                              {property.accessContact}
                            </TableCell>
                            {big8Keys().flatMap((key) =>
                              valueCellsFor(property, key, tab),
                            )}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      overall.status === "COMPLIANT"
                                        ? "bg-emerald-500"
                                        : "bg-red-500",
                                    )}
                                    style={{ width: `${overall.percentage}%` }}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs tabular-nums">
                                    {overall.percentage}%
                                  </span>
                                  <StatusPill status={overall.status} />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                +{property.documentCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <StatusPill status={property.insuranceStatus} />
                              <div className="mt-1 text-muted-foreground">
                                {property.insuranceExpiry ?? "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {property.nextInspectionDate ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {property.leaseSlaDate ?? "—"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          )
        })}
    </div>
  )
}

function RegionSummaryBar({ rows }: { rows: PropertyComplianceRow[] }) {
  const compliant = rows.filter(
    (row) => overallCompliance(row).status === "COMPLIANT",
  ).length
  const pct = Math.round((compliant / Math.max(rows.length, 1)) * 100)
  return (
    <div className="ml-auto flex items-center gap-2">
      <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
        <div
          className={cn(
            "h-full rounded-full",
            pct === 100 ? "bg-emerald-500" : "bg-amber-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {compliant}/{rows.length}
      </span>
    </div>
  )
}

function headerCellsFor(key: Big8CertKey, tab: TopTab) {
  const label = BIG8_LABELS[key]
  if (tab === "big8") {
    return [
      <TableHead key={`${key}-status`} className="min-w-32">
        {label} Status
      </TableHead>,
      <TableHead key={`${key}-expiry`} className="min-w-28">
        {label} Expiry
      </TableHead>,
    ]
  }
  return [
    <TableHead key={`${key}-upload`} className="min-w-28">
      {label} Upload
    </TableHead>,
    <TableHead key={`${key}-status`} className="min-w-32">
      {label} Status
    </TableHead>,
    <TableHead key={`${key}-expiry`} className="min-w-28">
      {label} Expiry
    </TableHead>,
  ]
}

function valueCellsFor(
  property: PropertyComplianceRow,
  key: Big8CertKey,
  tab: TopTab,
) {
  const cert = certForKey(property, key)
  const cells = []
  if (tab === "main") {
    cells.push(
      <TableCell key={`${property.id}-${key}-upload`} className="text-xs">
        {cert.uploadName ? (
          <span className="inline-flex items-center gap-1">
            <FileStack className="size-3.5 text-muted-foreground" />
            file
          </span>
        ) : (
          "—"
        )}
      </TableCell>,
    )
  }
  cells.push(
    <TableCell key={`${property.id}-${key}-status`}>
      <StatusPill status={cert.status} />
      {!cert.required ? (
        <span className="mt-1 block text-[10px] text-muted-foreground">
          Not required
        </span>
      ) : null}
    </TableCell>,
  )
  cells.push(
    <TableCell key={`${property.id}-${key}-expiry`} className="text-xs">
      {cert.expiryDate ?? "—"}
    </TableCell>,
  )
  return cells
}

function StatusPill({
  status,
}: {
  status: CertStatus | "COMPLIANT" | "NON-COMPLIANT"
}) {
  const tone = statusTone(status)
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        tone === "green" && "bg-emerald-100 text-emerald-800",
        tone === "amber" && "bg-amber-100 text-amber-900",
        tone === "red" && "bg-red-100 text-red-800",
      )}
    >
      {status}
    </span>
  )
}
