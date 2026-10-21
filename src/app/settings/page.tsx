import type { Metadata } from "next"
import { SettingsView } from "@/components/workbench/settings-view"

export const metadata: Metadata = {
  title: "Auditor Settings",
}

export default function SettingsPage() {
  return <SettingsView />
}
