import type { Metadata } from "next"
import { connection } from "next/server"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { createManagingAgent, createRound } from "@/lib/actions"
import {
  ROUND_FORMAT_LABEL,
  ROUND_STATUS_LABEL,
  formatAuditDate,
  formatCount,
  type RoundFormat,
  type RoundStatus,
} from "@/lib/audit"
import { listAgentsWithRounds } from "@/lib/queries"

export const metadata: Metadata = { title: "Rounds" }

// Reads the local database on every request, so it is a blocking route rather
// than a prerendered one. There is nothing here worth caching: the whole point
// is to show what is in the file right now.
export const instant = false

export default async function HomePage() {
  // Marks this render as request-time. Without it the page is statically
  // prerendered and the database contents are baked into the build.
  await connection()

  const agents = await listAgentsWithRounds()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Managing agents and rounds
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          A round is the deliverable; the resident file inside it is the unit of
          assurance. Open a round to add resident files and drop their documents
          in.
        </p>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No managing agents yet</CardTitle>
            <CardDescription>
              Add one below, or run <code>npm run db:seed</code> to load the
              synthetic sample round.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {agents.map(({ agent, rounds }) => (
        <Card key={agent.id} className="shadow-sm ring-foreground/8">
          <CardHeader className="border-b">
            <CardTitle>{agent.name}</CardTitle>
            <CardDescription>
              {[agent.contract, agent.region].filter(Boolean).join(" · ") ||
                "No contract or region recorded."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {rounds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rounds yet for this agent.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Round</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Audit date</TableHead>
                    <TableHead className="text-right">Resident files</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rounds.map((round) => (
                    <TableRow key={round.id}>
                      <TableCell>
                        <Link
                          href={`/rounds/${round.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {round.label}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ROUND_FORMAT_LABEL[round.format as RoundFormat] ??
                          round.format}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatAuditDate(round.auditDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCount(round.residentFileCount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ROUND_STATUS_LABEL[round.status as RoundStatus] ??
                          round.status}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <form
              action={createRound}
              className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
            >
              <input type="hidden" name="managingAgentId" value={agent.id} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`label-${agent.id}`}>New round</Label>
                <Input
                  id={`label-${agent.id}`}
                  name="label"
                  placeholder="October 2026"
                  required
                  className="w-56"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`audit-date-${agent.id}`}>Audit date</Label>
                <Input
                  id={`audit-date-${agent.id}`}
                  name="auditDate"
                  type="date"
                  className="w-44"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`format-${agent.id}`}>Format</Label>
                <select
                  id={`format-${agent.id}`}
                  name="format"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="FIRST_AUDIT">First audit</option>
                  <option value="REPEAT">Repeat audit</option>
                </select>
              </div>
              <Button type="submit" variant="outline">
                Add round
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Add a managing agent</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={createManagingAgent} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-name">Name</Label>
              <Input id="agent-name" name="name" required className="w-64" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-contract">Contract</Label>
              <Input id="agent-contract" name="contract" className="w-64" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-region">Region</Label>
              <Input id="agent-region" name="region" className="w-44" />
            </div>
            <Button type="submit">Add agent</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
