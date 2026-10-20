import type { Metadata } from "next"
import { CaseloadView } from "@/components/workbench/caseload-view"

export const metadata: Metadata = {
  title: "Audit project",
}

export default function HomePage() {
  return <CaseloadView />
}
