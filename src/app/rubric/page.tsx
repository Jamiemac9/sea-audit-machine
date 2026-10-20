import type { Metadata } from "next"
import { RubricSettingsView } from "@/components/workbench/rubric-settings-view"

export const metadata: Metadata = {
  title: "Rubric settings",
}

export default function RubricSettingsPage() {
  return <RubricSettingsView />
}
