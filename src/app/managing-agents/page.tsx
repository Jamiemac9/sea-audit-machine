import type { Metadata } from "next"
import { ManagingAgentsView } from "@/components/workbench/managing-agents-view"

export const metadata: Metadata = {
  title: "Managing Agents",
}

export default function ManagingAgentsPage() {
  return <ManagingAgentsView />
}
