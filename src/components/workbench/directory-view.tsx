"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import { useWorkbench } from "@/lib/workbench"
import { cn } from "cn"

export function DirectoryView() {
  const [tab, setTab] = useState<"rp" | "ma">("rp")

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          RP & MA Directory
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Registered Providers & Managing Agents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dedicated directory for locations, schemes, contacts, and approved
          rent schedules used to verify WR-02 and WR-07.
        </p>
      </div>

      <div className="inline-flex w-fit rounded-lg border bg-card p-0.5">
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            tab === "rp" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
          onClick={() => setTab("rp")}
        >
          Registered Providers (RPs)
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            tab === "ma" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
          onClick={() => setTab("ma")}
        >
          Managing Agents (MAs)
        </button>
      </div>

      {tab === "rp" ? <RpDirectory /> : <MaDirectory />}
    </div>
  )
}

function RpDirectory() {
  const {
    registeredProviders,
    managingAgents,
    updateRegisteredProvider,
  } = useWorkbench()

  return (
    <div className="grid gap-4">
      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle>RP directory table</CardTitle>
          <CardDescription>
            Head office location, region, linked managing agents, and default
            SLA terms.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RP Name</TableHead>
                <TableHead>Head Office</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Key contacts</TableHead>
                <TableHead>Linked MAs</TableHead>
                <TableHead>Default SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registeredProviders.map((rp) => (
                <TableRow key={rp.id}>
                  <TableCell className="font-medium">{rp.name}</TableCell>
                  <TableCell>{rp.headOfficeLocation}</TableCell>
                  <TableCell>{rp.region}</TableCell>
                  <TableCell className="max-w-xs text-xs">
                    {rp.contacts.map((contact) => (
                      <div key={contact.role} className="mb-1">
                        <span className="font-medium">{contact.role}:</span>{" "}
                        {contact.name} · {contact.email} · {contact.phone}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="text-xs">
                    {rp.linkedManagingAgentIds
                      .map(
                        (id) =>
                          managingAgents.find((agent) => agent.id === id)
                            ?.companyName ?? id,
                      )
                      .join(", ")}
                  </TableCell>
                  <TableCell className="max-w-xs text-xs text-muted-foreground">
                    {rp.defaultSlaTerms}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {registeredProviders.map((rp) => (
          <Card key={rp.id} className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>{rp.name}</CardTitle>
              <CardDescription>
                {rp.headOfficeLocation} · {rp.region}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label>Head office location</Label>
                  <Input
                    className="mt-1"
                    value={rp.headOfficeLocation}
                    onChange={(event) =>
                      updateRegisteredProvider(rp.id, {
                        headOfficeLocation: event.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input
                    className="mt-1"
                    value={rp.region}
                    onChange={(event) =>
                      updateRegisteredProvider(rp.id, {
                        region: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Default SLA terms</Label>
                <Textarea
                  className="mt-1 min-h-20 text-sm"
                  value={rp.defaultSlaTerms}
                  onChange={(event) =>
                    updateRegisteredProvider(rp.id, {
                      defaultSlaTerms: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Schemes
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {rp.schemes.map((scheme) => (
                    <Badge key={scheme.id} variant="secondary">
                      {scheme.name} · {scheme.location}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function MaDirectory() {
  const { managingAgents, updateManagingAgent, registeredProviders } =
    useWorkbench()

  return (
    <div className="grid gap-4">
      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle>Managing Agent directory</CardTitle>
          <CardDescription>
            Registered address auto-verifies WR-02 excluded licence addresses.
            Rent schedule verifies WR-02 and WR-07 figures.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MA Company</TableHead>
                <TableHead>Registered address</TableHead>
                <TableHead>Primary contact</TableHead>
                <TableHead>Access PoC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Properties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managingAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">
                    {agent.companyName}
                  </TableCell>
                  <TableCell className="max-w-xs text-xs">
                    {agent.registeredAddress}
                  </TableCell>
                  <TableCell className="text-xs">
                    {agent.primaryContactName}
                    <br />
                    {agent.email}
                    <br />
                    {agent.phone}
                  </TableCell>
                  <TableCell className="text-xs">
                    {agent.propertyAccessContact}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        agent.activeStatus === "Active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {agent.activeStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs text-xs">
                    {agent.assignedProperties.join("; ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {managingAgents.map((agent) => (
        <Card key={agent.id} className="shadow-sm ring-foreground/8">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>{agent.companyName}</CardTitle>
                <CardDescription>
                  Linked RPs:{" "}
                  {agent.linkedRpIds
                    .map(
                      (id) =>
                        registeredProviders.find((rp) => rp.id === id)?.name ??
                        id,
                    )
                    .join(", ")}
                </CardDescription>
              </div>
              <Badge
                variant={
                  agent.activeStatus === "Active" ? "default" : "secondary"
                }
              >
                {agent.activeStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2">
                <Label>Registered address</Label>
                <Input
                  className="mt-1"
                  value={agent.registeredAddress}
                  onChange={(event) =>
                    updateManagingAgent(agent.id, {
                      registeredAddress: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Primary contact</Label>
                <Input
                  className="mt-1"
                  value={agent.primaryContactName}
                  onChange={(event) =>
                    updateManagingAgent(agent.id, {
                      primaryContactName: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  className="mt-1"
                  value={agent.email}
                  onChange={(event) =>
                    updateManagingAgent(agent.id, { email: event.target.value })
                  }
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  className="mt-1"
                  value={agent.phone}
                  onChange={(event) =>
                    updateManagingAgent(agent.id, { phone: event.target.value })
                  }
                />
              </div>
              <div>
                <Label>Point of contact for property access</Label>
                <Input
                  className="mt-1"
                  value={agent.propertyAccessContact}
                  onChange={(event) =>
                    updateManagingAgent(agent.id, {
                      propertyAccessContact: event.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">
                Approved Property Rent & Service Charge Schedule
              </p>
              <div className="mt-2 overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property / address</TableHead>
                      <TableHead>Room / unit</TableHead>
                      <TableHead>Weekly rent</TableHead>
                      <TableHead>Service charge</TableHead>
                      <TableHead>Effective from</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.rentSchedule.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.propertyAddress}</TableCell>
                        <TableCell>{row.roomOrUnit}</TableCell>
                        <TableCell>£{row.weeklyRent.toFixed(2)}</TableCell>
                        <TableCell>
                          £{row.weeklyServiceCharge.toFixed(2)}
                        </TableCell>
                        <TableCell>{row.effectiveFrom}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
