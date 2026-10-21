"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CLIENT_TOKEN } from "@/lib/documents"
import { useWorkbench } from "@/lib/workbench"

export function SettingsView() {
  const {
    secureMode,
    setSecureMode,
    file,
    project,
    auditor,
    setAuditor,
    masterlist,
    updateMasterlistSection,
  } = useWorkbench()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Auditor Settings
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Lead Auditor profile & masterlist
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Editable auditor details and qualitative masterlist sections used in
          Word reports. Reports always name {CLIENT_TOKEN} or the active RP from
          the directory — never a hard-coded brand placeholder.
        </p>
      </div>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle>Local secure mode</CardTitle>
          <CardDescription>
            Keeps extracts, scores, and reports on this workstation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Status:{" "}
            <span className="font-medium">
              {secureMode ? "Active" : "Inactive"}
            </span>
          </p>
          <Button
            variant={secureMode ? "outline" : "default"}
            aria-pressed={secureMode}
            onClick={() => setSecureMode(!secureMode)}
          >
            {secureMode ? "Turn secure mode off" : "Turn secure mode on"}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle>Lead Auditor profile</CardTitle>
          <CardDescription>
            Used on Missing Information Request emails and .docx reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="auditor-name">Name</Label>
            <Input
              id="auditor-name"
              className="mt-1"
              value={auditor.name}
              onChange={(event) => setAuditor({ name: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="auditor-role">Role</Label>
            <Input
              id="auditor-role"
              className="mt-1"
              value={auditor.role}
              onChange={(event) => setAuditor({ role: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="auditor-email">Email</Label>
            <Input
              id="auditor-email"
              className="mt-1"
              value={auditor.email}
              onChange={(event) => setAuditor({ email: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="auditor-phone">Phone</Label>
            <Input
              id="auditor-phone"
              className="mt-1"
              value={auditor.phone}
              onChange={(event) => setAuditor({ phone: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="auditor-org">Organisation</Label>
            <Input
              id="auditor-org"
              className="mt-1"
              value={auditor.organisation}
              onChange={(event) =>
                setAuditor({ organisation: event.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle>Masterlist customisation</CardTitle>
          <CardDescription>
            Relevancy, Follow-up, Resources, Evidence, Practical Support,
            Progress, Duplication, and General Notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {masterlist.map((section) => (
            <div key={section.id}>
              <Label htmlFor={`master-${section.id}`}>{section.label}</Label>
              <Textarea
                id={`master-${section.id}`}
                className="mt-1 min-h-20 text-sm"
                value={section.content}
                onChange={(event) =>
                  updateMasterlistSection(section.id, event.target.value)
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle>Active context</CardTitle>
          <CardDescription>
            Current project and resident file for this session.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">
            {project.name}
            <span className="px-1.5 text-muted-foreground">/</span>
            {project.clientLabel}
          </p>
          <p className="mt-2 text-muted-foreground">
            {file
              ? `${file.reference} · ${file.managingAgent || "Managing agent not set"}`
              : "No resident file is open."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
