import type { Metadata } from "next"
import { ComplianceCrmView } from "@/components/workbench/compliance-crm-view"

export const metadata: Metadata = {
  title: "Property Compliance CRM",
}

export default function CompliancePage() {
  return <ComplianceCrmView />
}
