import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Where things are stored. This replaces the previous "secure mode" toggle,
 * which showed a badge but moved no data — a control that claims a data
 * protection property it does not enforce is worse than none.
 */
export function SettingsView({
  dataDir,
  databaseFile,
}: {
  dataDir: string | null
  databaseFile: string | null
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Workstation
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This workbench runs locally and holds resident data on this machine
          only.
        </p>
      </div>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle>Storage</CardTitle>
          <CardDescription>
            Both paths must sit outside the project folder. Resident documents
            are special category data, and this repository is for code.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p>
            <span className="text-muted-foreground">Document store</span>
            <span className="mt-0.5 block font-mono text-xs break-all">
              {dataDir ?? "AUDIT_DATA_DIR is not set"}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Database</span>
            <span className="mt-0.5 block font-mono text-xs break-all">
              {databaseFile ?? "DATABASE_URL is not set"}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle>What leaves this machine</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Nothing, by default. There is no cloud sync, no external API call
            and no telemetry in this application. Documents are read on this
            machine and the database holds metadata and findings, never document
            bytes.
          </p>
          <p>
            There is also no authentication yet. Anyone with access to this
            machine and the dev server has access to everything in it.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
