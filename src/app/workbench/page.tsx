import { Suspense } from "react"
import { AuditWorkbench } from "@/components/workbench/audit-workbench"

export const metadata = {
  title: "Audit Workbench",
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-600">Loading the audit workbench…</p>}>
      <AuditWorkbench />
    </Suspense>
  )
}
