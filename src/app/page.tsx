import type { Metadata } from "next"
import { SupportCrmView } from "@/components/workbench/support-crm-view"

export const metadata: Metadata = {
  title: "Support Audit CRM",
}

export default function HomePage() {
  return <SupportCrmView />
}
