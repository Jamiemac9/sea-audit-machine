"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { residentDocuments } from "@/lib/documents"
import { useWorkbench } from "@/lib/workbench"

export function DocumentsView() {
  const { file, setDocumentReceived } = useWorkbench()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Document suite
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          WR-01 to WR-22
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Checks for {file.reference}. Mark a form received only when it is in
          the local extract.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {residentDocuments.map((document) => (
          <Card key={document.code} className="shadow-sm ring-foreground/8">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {document.code}
                  </p>
                  <CardTitle className="mt-1">{document.title}</CardTitle>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={file.received[document.code]}
                    aria-label={`${document.code} received`}
                    onChange={(event) =>
                      setDocumentReceived(
                        file.id,
                        document.code,
                        event.target.checked,
                      )
                    }
                  />
                  Received
                </label>
              </div>
              <CardDescription>
                {file.received[document.code] ? "On the file." : "Not on the file."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {document.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
