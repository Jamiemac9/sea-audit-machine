"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useWorkbench } from "@/lib/workbench"

export function SettingsView() {
  const { secureMode, setSecureMode, clientName, schemeName } = useWorkbench()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Workstation
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Local session controls for the internal audit workbench.
        </p>
      </div>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle>Local secure mode</CardTitle>
          <CardDescription>
            Keeps evidence, scores, and reports on this workstation. The header
            shows whether the mode is active.
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
          <CardTitle>Profile</CardTitle>
          <CardDescription>Signed in on this workstation only.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name</span>
            <span className="mt-0.5 block font-medium">Amara Okonkwo</span>
          </p>
          <p>
            <span className="text-muted-foreground">Role</span>
            <span className="mt-0.5 block font-medium">
              Head of Internal Audit
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Session</span>
            <span className="mt-0.5 block font-medium">
              amara.okonkwo@audit.local
            </span>
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle>Active context</CardTitle>
          <CardDescription>
            Change the client or scheme from the header. It filters projects,
            agent performance, and the report export together.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">
            {clientName}
            <span className="px-1.5 text-muted-foreground">/</span>
            {schemeName}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
