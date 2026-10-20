import type { Metadata } from "next"
import { AuditExecutionView } from "@/components/workbench/audit-execution-view"

export const metadata: Metadata = {
  title: "Resident file",
}

export default function AuditPage() {
  return <AuditExecutionView />
}
