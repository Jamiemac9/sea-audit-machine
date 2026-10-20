import type { Metadata } from "next"
import { AuditExecutionView } from "@/components/workbench/audit-execution-view"

export const metadata: Metadata = {
  title: "Audit execution",
}

export default function AuditPage() {
  return <AuditExecutionView />
}
