import type { Metadata } from "next"
import { AuditWorkbenchView } from "@/components/workbench/audit-workbench-view"

export const metadata: Metadata = {
  title: "Audit Workbench",
}

export default function WorkbenchPage() {
  return <AuditWorkbenchView />
}
