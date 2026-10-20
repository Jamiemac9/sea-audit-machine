import type { Metadata } from "next"
import { ReportsView } from "@/components/workbench/reports-view"

export const metadata: Metadata = {
  title: "Reports Archive",
}

export default function ReportsPage() {
  return <ReportsView />
}
