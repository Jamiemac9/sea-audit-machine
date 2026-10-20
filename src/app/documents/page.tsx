import type { Metadata } from "next"
import { DocumentsView } from "@/components/workbench/documents-view"

export const metadata: Metadata = {
  title: "Document suite",
}

export default function DocumentsPage() {
  return <DocumentsView />
}
