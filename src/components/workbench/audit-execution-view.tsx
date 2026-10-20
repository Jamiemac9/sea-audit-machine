"use client"

import { RatingBadge, RiskTierBadge } from "@/components/workbench/rating-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { residentDocuments, WR_CODES } from "@/lib/documents"
import {
  FEEDBACK_CATEGORIES,
  analyseFormatting,
} from "@/lib/feedback"
import {
  LIKELIHOOD_LEVELS,
  SEVERITY_LEVELS,
  matrixScore,
  requiresRiskManagementPlan,
  riskTier,
} from "@/lib/risk"
import { rateFile } from "@/lib/rating"
import { useWorkbench } from "@/lib/workbench"

export function AuditExecutionView() {
  const { file, updateFile, setDocumentReceived, signOff } = useWorkbench()
  const score = matrixScore(file.likelihood, file.severity)
  const tier = riskTier(score)
  const result = rateFile(file)
  const formatting = analyseFormatting(file.supportDelivered, file.feedbackOnSupport)
  const planRequired = requiresRiskManagementPlan(score)

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Audit execution
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {file.reference}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Local OCR extract on the left. WR checks, matrix, and feedback on
            the right. Nothing is sent off this workstation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RatingBadge rating={result.rating} />
          <RiskTierBadge tier={tier.id} label={`${score} · ${tier.label}`} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-sm ring-foreground/8 lg:overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle>OCR extract</CardTitle>
            <CardDescription>
              Text read from the resident file on this machine. Edit it if the
              extract needs a correction.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 lg:h-[calc(100svh-16rem)] lg:overflow-y-auto">
            <Textarea
              aria-label="OCR extracted text"
              value={file.ocrText}
              onChange={(event) =>
                updateFile(file.id, { ocrText: event.target.value })
              }
              className="min-h-80 font-mono text-xs leading-5"
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:h-[calc(100svh-16rem)] lg:overflow-y-auto lg:pr-1">
          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>File rating</CardTitle>
              <CardDescription>{result.reasons[0]}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {result.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>5×5 risk matrix</CardTitle>
              <CardDescription>
                Likelihood × severity. A score of 5 or more requires a WR-09
                Risk Management Plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-sm">
                Matrix score{" "}
                <span className="font-semibold tabular-nums">{score}</span>
                {file.scoreOnForm === score
                  ? " matches the form."
                  : ` does not match the form score of ${file.scoreOnForm}.`}
              </p>
              {planRequired && !file.riskManagementPlan ? (
                <p
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
                  role="status"
                >
                  Score {score} requires a completed Risk Management Plan in
                  WR-09.
                </p>
              ) : null}
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={file.riskManagementPlan}
                  onChange={(event) =>
                    updateFile(file.id, {
                      riskManagementPlan: event.target.checked,
                      received: {
                        ...file.received,
                        "WR-09": event.target.checked
                          ? true
                          : file.received["WR-09"],
                      },
                    })
                  }
                />
                <span>WR-09 Risk Management Plan is complete.</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="likelihood">Likelihood</Label>
                  <Select
                    value={String(file.likelihood)}
                    onValueChange={(value) => {
                      if (typeof value === "string") {
                        updateFile(file.id, { likelihood: Number(value) })
                      }
                    }}
                  >
                    <SelectTrigger id="likelihood" className="w-full">
                      <SelectValue>
                        {(value) => {
                          const level = LIKELIHOOD_LEVELS.find(
                            (item) => String(item.value) === value,
                          )
                          return level ? `${level.value} · ${level.label}` : "Likelihood"
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LIKELIHOOD_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={String(level.value)}>
                          {level.value} · {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={String(file.severity)}
                    onValueChange={(value) => {
                      if (typeof value === "string") {
                        updateFile(file.id, { severity: Number(value) })
                      }
                    }}
                  >
                    <SelectTrigger id="severity" className="w-full">
                      <SelectValue>
                        {(value) => {
                          const level = SEVERITY_LEVELS.find(
                            (item) => String(item.value) === value,
                          )
                          return level ? `${level.value} · ${level.label}` : "Severity"
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={String(level.value)}>
                          {level.value} · {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Score written on the form</span>
                <input
                  aria-label="Score written on the form"
                  inputMode="numeric"
                  className="h-8 rounded-lg border border-input px-2.5"
                  value={file.scoreOnForm}
                  onChange={(event) =>
                    updateFile(file.id, {
                      scoreOnForm: Number(event.target.value) || 0,
                    })
                  }
                />
              </label>
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>WR-13 formatting</CardTitle>
              <CardDescription>
                Support Delivered is the action list. Feedback on Support is
                the quality commentary.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {formatting.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm text-amber-900">
                  {formatting.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-800">Formatting guide met.</p>
              )}
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Support Delivered to the Resident</span>
                <Textarea
                  aria-label="Support Delivered to the Resident"
                  value={file.supportDelivered}
                  onChange={(event) =>
                    updateFile(file.id, { supportDelivered: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Feedback on Support Provided</span>
                <Textarea
                  aria-label="Feedback on Support Provided"
                  value={file.feedbackOnSupport}
                  onChange={(event) =>
                    updateFile(file.id, { feedbackOnSupport: event.target.value })
                  }
                />
              </label>
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>Feedback masterlist</CardTitle>
              <CardDescription>
                Choose the categories that apply to this file.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {FEEDBACK_CATEGORIES.map((category) => {
                const checked = file.feedbackCategories.includes(category)
                return (
                  <label key={category} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={(event) => {
                        const feedbackCategories = event.target.checked
                          ? [...file.feedbackCategories, category]
                          : file.feedbackCategories.filter((item) => item !== category)
                        updateFile(file.id, { feedbackCategories })
                      }}
                    />
                    <span>{category}</span>
                  </label>
                )
              })}
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>Documents on the file</CardTitle>
              <CardDescription>
                {WR_CODES.filter((code) => file.received[code]).length} of{" "}
                {WR_CODES.length} marked received.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {residentDocuments.map((document) => (
                <label key={document.code} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={file.received[document.code]}
                    onChange={(event) =>
                      setDocumentReceived(
                        file.id,
                        document.code,
                        event.target.checked,
                      )
                    }
                  />
                  <span>
                    <span className="font-medium">{document.code}</span>{" "}
                    {document.title}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {file.signedOff
                ? "Signed off. The return package can be built."
                : "Sign off after the extract and checks have been verified."}
            </p>
            <Button onClick={() => signOff(file.id)} disabled={file.signedOff}>
              {file.signedOff ? "Signed off" : "Sign off file"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
