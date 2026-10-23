import type { Metadata } from "next"
import { SettingsView } from "@/components/workbench/settings-view"

export const metadata: Metadata = {
  title: "Settings",
}


// Reads the local database on every request, so it is a blocking route rather
// than a prerendered one. There is nothing here worth caching: the whole point
// is to show what is in the file right now.
export const instant = false

export default function SettingsPage() {
  return (
    <SettingsView
      dataDir={process.env.AUDIT_DATA_DIR ?? null}
      databaseFile={process.env.DATABASE_URL?.replace(/^file:/, "") ?? null}
    />
  )
}
