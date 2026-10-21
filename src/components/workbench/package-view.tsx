"use client"

import { useState } from "react"
import { RatingBadge } from "@/components/workbench/rating-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AGENT_TOKEN, CLIENT_TOKEN } from "@/lib/documents"
import { reportPackage } from "@/lib/report"
import { rateFile } from "@/lib/rating"
import { createZip } from "@/lib/zip"
import { useWorkbench } from "@/lib/workbench"

export function PackageView() {
  const { file, project, questions } = useWorkbench()
  const [notice, setNotice] = useState("")
  if (!file) {
    return (
      <p className="text-sm text-muted-foreground">
        This project has no resident file to package.
      </p>
    )
  }
  const result = rateFile(file)
  const pack = reportPackage(file, {
    clientLabel: project.clientLabel,
    questions: questions.filter((question) => question.projectId === file.projectId),
  })

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Return pack
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Report package
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          After sign-off, build a local zip for {file.reference}. The report
          names {CLIENT_TOKEN} and {AGENT_TOKEN}. The mock agent on this file
          is {file.managingAgent}.
        </p>
      </div>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {file.reference}
            <RatingBadge rating={result.rating} />
          </CardTitle>
          <CardDescription>
            {file.signedOff
              ? "Human verification is recorded."
              : "Sign the file off from Audit execution before packaging."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pack.catchUp ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {result.rating} rating. The zip will include a remediation
              catch-up flag for the managing agent.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This rating does not flag a remediation catch-up call.
            </p>
          )}
          <ul className="text-sm text-muted-foreground">
            {pack.files.map((entry) => (
              <li key={entry.name}>{entry.name}</li>
            ))}
          </ul>
          <p className="text-sm" role="status">
            {notice || "The zip stays on this workstation."}
          </p>
          <Button
            disabled={!file.signedOff}
            onClick={() => {
              const bytes = createZip(pack.files)
              const blob = new Blob([bytes], { type: "application/zip" })
              const url = URL.createObjectURL(blob)
              const link = document.createElement("a")
              const filename = `${file.reference}-seaaudit-return.zip`
              link.href = url
              link.download = filename
              link.click()
              URL.revokeObjectURL(url)
              setNotice(`Prepared ${filename}`)
            }}
          >
            Build return zip
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
