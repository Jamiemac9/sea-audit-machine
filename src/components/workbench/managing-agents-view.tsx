"use client"

import { AssurancePill } from "@/components/workbench/assurance-pill"
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
  ASSURANCE_LINE,
  ASSURANCE_RATINGS,
  formatCount,
  formatScore,
  performanceByAgent,
  type AssuranceRating,
} from "@/lib/audit"
import { useWorkbench } from "@/lib/workbench"
import { cn } from "cn"

const barColor: Record<AssuranceRating, string> = {
  Substantial: "bg-emerald-600",
  Reasonable: "bg-blue-600",
  Limited: "bg-amber-500",
  "No Assurance": "bg-red-600",
}

export function ManagingAgentsView() {
  const { clientName, schemeName, projects, remediations, schemes } =
    useWorkbench()
  const rows = performanceByAgent(projects, remediations)
  const portfolio =
    projects.length === 0
      ? null
      : projects.reduce((sum, project) => sum + project.complianceScore, 0) /
        projects.length
  const behind = rows.filter((row) => row.averageScore < ASSURANCE_LINE)
  const schemeById = new Map(schemes.map((scheme) => [scheme.id, scheme.name]))

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Performance
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Managing agents
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Compare third-party providers for {clientName}, {schemeName}. Scores
          are the mean compliance result of their projects in this scope. The
          internal line for statutory compliance work is {ASSURANCE_LINE}.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card size="sm" className="shadow-sm ring-foreground/8">
          <CardHeader>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Portfolio average
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {portfolio === null ? "—" : formatScore(portfolio)}
            </p>
          </CardHeader>
        </Card>
        <Card size="sm" className="shadow-sm ring-foreground/8">
          <CardHeader>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Agents in scope
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {formatCount(rows.length)}
            </p>
          </CardHeader>
        </Card>
        <Card size="sm" className="shadow-sm ring-foreground/8">
          <CardHeader>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Behind the line
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {formatCount(behind.length)}
            </p>
          </CardHeader>
        </Card>
      </section>

      {behind.length > 0 ? (
        <Card className="border-l-4 border-l-amber-500 shadow-sm ring-foreground/8">
          <CardHeader>
            <CardTitle>Providers falling behind</CardTitle>
            <CardDescription>
              {behind.map((row) => row.agent.name).join(", ")}{" "}
              {behind.length === 1 ? "is" : "are"} under {ASSURANCE_LINE} on
              statutory compliance work in this scope.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-l-4 border-l-emerald-600 shadow-sm ring-foreground/8">
          <CardHeader>
            <CardTitle>No provider is under the line</CardTitle>
            <CardDescription>
              Every managing agent in this scope is at or above {ASSURANCE_LINE}.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {rows.map((row, index) => {
          const rating =
            row.averageScore >= 90
              ? "Substantial"
              : row.averageScore >= ASSURANCE_LINE
                ? "Reasonable"
                : row.averageScore >= 60
                  ? "Limited"
                  : "No Assurance"
          const gap =
            portfolio === null ? 0 : row.averageScore - portfolio
          return (
            <Card key={row.agent.id} className="shadow-sm ring-foreground/8">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Rank {index + 1} · {row.agent.region}
                    </p>
                    <CardTitle className="mt-1">{row.agent.name}</CardTitle>
                    <CardDescription>{row.agent.contract}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold tabular-nums">
                      {formatScore(row.averageScore)}
                    </p>
                    <AssurancePill rating={rating} className="mt-1" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <div className="relative h-2 rounded-full bg-muted">
                    <div
                      className={cn("h-2 rounded-full", barColor[rating])}
                      style={{
                        width: `${Math.max(0, Math.min(100, row.averageScore))}%`,
                      }}
                    />
                    <span
                      className="absolute top-[-3px] h-3.5 w-px bg-foreground/40"
                      style={{ left: `${ASSURANCE_LINE}%` }}
                      title={`Assurance line ${ASSURANCE_LINE}`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {gap >= 0 ? formatScore(gap) : formatScore(Math.abs(gap))}{" "}
                    {gap >= 0 ? "above" : "below"} the portfolio average. Marker
                    at {ASSURANCE_LINE}.
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                      Files
                    </dt>
                    <dd className="mt-1 font-medium tabular-nums">
                      {formatCount(row.filesAudited)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                      Projects
                    </dt>
                    <dd className="mt-1 font-medium tabular-nums">
                      {formatCount(row.projects.length)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                      Open calls
                    </dt>
                    <dd className="mt-1 font-medium tabular-nums">
                      {formatCount(row.openCalls)}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-1.5">
                  {ASSURANCE_RATINGS.map((item) => (
                    <span
                      key={item}
                      className="text-xs text-muted-foreground"
                    >
                      <AssurancePill rating={item} />
                      <span className="ml-1 tabular-nums">
                        {row.assuranceCounts[item]}
                      </span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Findings by managing agent</CardTitle>
          <CardDescription>
            Lowest-scoring providers are listed first, then their weakest
            projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              No managing agent findings in this scheme.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Managing agent</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Scheme</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Assurance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.flatMap((row) =>
                  row.projects.map((project, projectIndex) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {projectIndex === 0 ? row.agent.name : ""}
                      </TableCell>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>
                        {schemeById.get(project.schemeId) ?? project.schemeId}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {project.complianceScore}
                      </TableCell>
                      <TableCell>
                        <AssurancePill rating={project.assurance} />
                      </TableCell>
                      <TableCell>{project.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
