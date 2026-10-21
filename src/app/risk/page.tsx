import type { Metadata } from "next"
import { RiskView } from "@/components/workbench/risk-view"

export const metadata: Metadata = {
  title: "Risk matrix",
}

export default function RiskPage() {
  return <RiskView />
}
