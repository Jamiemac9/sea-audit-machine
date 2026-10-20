import type { Metadata } from "next"
import { DashboardView } from "@/components/workbench/dashboard-view"

export const metadata: Metadata = {
  title: "Projects",
}

export default function HomePage() {
  return <DashboardView />
}
