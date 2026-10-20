import type { Metadata } from "next"
import { PackageView } from "@/components/workbench/package-view"

export const metadata: Metadata = {
  title: "Report package",
}

export default function ReportsPage() {
  return <PackageView />
}
