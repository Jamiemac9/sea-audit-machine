"use client"

import { Packer } from "docx"
import { saveAs } from "file-saver"
import { buildFileDocument, buildPackageDocument } from "@/lib/docx-report"
import { agentLabel, downloadStem } from "@/lib/text"
import type { ManagingAgent, Profile, RentSchedule, ResidentFile } from "@/lib/types"

export async function downloadFileReport(input: {
  profile: Profile
  agent: ManagingAgent
  file: ResidentFile
  rentSchedules: RentSchedule[]
}) {
  const blob = await Packer.toBlob(buildFileDocument(input))
  saveAs(blob, `Seaaudit-${downloadStem(input.file.fileName)}-audit-report.docx`)
}

export async function downloadAgentPackage(input: {
  profile: Profile
  agent: ManagingAgent
  files: ResidentFile[]
  rentSchedules: RentSchedule[]
}) {
  const blob = await Packer.toBlob(buildPackageDocument(input))
  saveAs(
    blob,
    `Seaaudit-${downloadStem(agentLabel(input.agent.name))}-audit-package.docx`,
  )
}
