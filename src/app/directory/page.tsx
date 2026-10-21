import type { Metadata } from "next"
import { DirectoryView } from "@/components/workbench/directory-view"

export const metadata: Metadata = {
  title: "RP & MA Directory",
}

export default function DirectoryPage() {
  return <DirectoryView />
}
