import type { Metadata } from "next"
import { RubricView } from "@/components/workbench/rubric-view"

export const metadata: Metadata = {
  title: "Audit Rubric",
}

export default function AuditRubricPage() {
  return <RubricView />
}
