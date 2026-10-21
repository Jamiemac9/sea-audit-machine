"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Copy,
  FileDown,
  ScanSearch,
  Upload,
} from "lucide-react"
import { InlineText } from "@/components/workbench/inline-field"
import { RatingBadge, RiskTierBadge } from "@/components/workbench/rating-badge"
import { RubricEditor } from "@/components/workbench/rubric-editor"
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
import {
  buildMissingInfoRequestEmail,
  scanCompleteness,
} from "@/lib/completenessGate"
import { deepAuditExtract } from "@/lib/deepAuditExtractor"
import { downloadResidentDocx } from "@/lib/docxReport"
import { classifyUploads } from "@/lib/extractBundle"
import { residentDocuments, WR_CODES } from "@/lib/documents"
import { FEEDBACK_CATEGORIES, analyseFormatting } from "@/lib/feedback"
import {
  LIKELIHOOD_LEVELS,
  SEVERITY_LEVELS,
  matrixScore,
  requiresRiskManagementPlan,
  riskTier,
} from "@/lib/risk"
import { rateFile } from "@/lib/rating"
import { useWorkbench } from "@/lib/workbench"
import { cn } from "cn"

export function AuditWorkbenchView() {
  const { file } = useWorkbench()
  if (!file) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Audit Workbench
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          No resident profile selected
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open a file from Support Audit CRM, or drop a multi-file resident
          evidence bundle below to create a profile.
        </p>
        <NewBundleDropzone />
      </div>
    )
  }
  return <WorkbenchBody />
}

function NewBundleDropzone() {
  const { project, createResidentFromBundle, managingAgents } = useWorkbench()
  const [dragOver, setDragOver] = useState(false)
  const [agentId, setAgentId] = useState(managingAgents[0]?.id ?? "")

  async function ingest(list: File[]) {
    if (list.length === 0) return
    const uploads = await classifyUploads(list)
    const agent = managingAgents.find((item) => item.id === agentId)
    createResidentFromBundle(
      project.id,
      list[0].name.replace(/\.[^.]+$/, "").toUpperCase().slice(0, 24) || "BUNDLE",
      uploads,
      {
        managingAgent: agent?.companyName,
        managingAgentId: agent?.id,
      },
    )
  }

  return (
    <div className="mt-6 space-y-3">
      <Select
        value={agentId}
        onValueChange={(value) => {
          if (typeof value === "string") setAgentId(value)
        }}
      >
        <SelectTrigger className="w-72 bg-background" aria-label="Managing agent">
          <SelectValue placeholder="Managing agent" />
        </SelectTrigger>
        <SelectContent>
          {managingAgents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.companyName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-card",
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          void ingest(Array.from(event.dataTransfer.files))
        }}
      >
        <Upload className="size-5 text-muted-foreground" />
        <span className="text-sm font-medium">
          Drop resident evidence bundle (PDF, Word, JPG/PNG)
        </span>
        <span className="text-xs text-muted-foreground">
          Multi-file upload — WR-01–WR-22 forms, session notes, and evidence
        </span>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.md"
          className="sr-only"
          onChange={(event) => {
            void ingest(Array.from(event.target.files ?? []))
            event.target.value = ""
          }}
        />
      </label>
    </div>
  )
}

function MissingItemsBanner() {
  const {
    file,
    managingAgents,
    project,
    auditor,
    flagMissingRequest,
    uploadReceivedItems,
    markDownAndProceed,
  } = useWorkbench()
  const [copied, setCopied] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

  if (!file) return null
  const scan = scanCompleteness(file, { managingAgents })
  if (scan.items.length === 0) return null

  const email =
    file.gateEmailDraft ||
    buildMissingInfoRequestEmail(file, scan, {
      clientLabel: project.clientLabel,
      agentName: file.managingAgent,
      auditorName: auditor.name,
      deadline: file.reRequestDeadline || undefined,
    })

  async function onFlag() {
    const draft = flagMissingRequest(file!.id, 7)
    setShowEmail(true)
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function onSupplement(list: File[]) {
    const uploads = await classifyUploads(list)
    uploadReceivedItems(file!.id, uploads)
  }

  return (
    <div className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-4 text-amber-950 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <p className="text-sm font-semibold">
              Missing & Incomplete Items Tracker
            </p>
          </div>
          <p className="mt-1 text-sm text-amber-900/80">
            {scan.missingCount} missing · {scan.incompleteCount} incomplete
            {scan.markedDownCount
              ? ` · ${scan.markedDownCount} marked down`
              : ""}
            {file.status === "Awaiting More Info" && file.reRequestDeadline
              ? ` · Re-request deadline ${file.reRequestDeadline}`
              : ""}
            {scan.blocking
              ? " — Stage 1 gate is open before final audit."
              : " — Gate cleared or marked down; proceed to deep audit."}
          </p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {scan.items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs",
                  item.markedDown
                    ? "border-red-300 bg-red-50 text-red-900"
                    : "border-amber-200/80 bg-white/70",
                )}
              >
                <span className="font-medium">{item.title}</span>
                <span className="mt-0.5 block text-[11px] opacity-80">
                  {item.kind}
                  {item.markedDown ? " · Failed / Marked Down" : ""} —{" "}
                  {item.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex w-full flex-col gap-2 lg:w-64">
          <Button onClick={() => void onFlag()} className="justify-start gap-2">
            <Copy className="size-3.5" />
            {copied ? "Copied request email" : "Flag to Request"}
          </Button>
          <label className="inline-flex h-8 cursor-pointer items-center justify-start gap-2 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted">
            <Upload className="size-3.5" />
            Upload Received Items
            <input
              type="file"
              multiple
              className="sr-only"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
              onChange={(event) => {
                void onSupplement(Array.from(event.target.files ?? []))
                event.target.value = ""
              }}
            />
          </label>
          <Button
            variant="destructive"
            className="justify-start"
            onClick={() => markDownAndProceed(file.id)}
          >
            Not Received — Mark Down & Proceed
          </Button>
        </div>
      </div>
      {showEmail || file.gateEmailDraft ? (
        <div className="mt-4">
          <Label htmlFor="missing-email">Missing Information Request Email</Label>
          <Textarea
            id="missing-email"
            className="mt-1 min-h-40 font-mono text-xs"
            readOnly
            value={email}
          />
        </div>
      ) : null}
    </div>
  )
}

function WorkbenchBody() {
  const {
    file,
    updateFile,
    setDocumentReceived,
    signOff,
    runDeepExtraction,
    addBundleToFile,
    managingAgents,
    project,
    questions,
    masterlist,
    auditor,
  } = useWorkbench()
  const [dragOver, setDragOver] = useState(false)
  const [busyDocx, setBusyDocx] = useState(false)
  const extraction = useMemo(
    () =>
      file
        ? deepAuditExtract(file, { managingAgents })
        : null,
    [file, managingAgents],
  )

  if (!file || !extraction) return null
  const active = file

  const score = matrixScore(active.likelihood, active.severity)
  const tier = riskTier(score)
  const result = rateFile(active)
  const formatting = analyseFormatting(
    active.supportDelivered,
    active.feedbackOnSupport,
  )
  const planRequired = requiresRiskManagementPlan(score)

  async function ingestBundle(list: File[]) {
    if (!list.length) return
    const uploads = await classifyUploads(list)
    addBundleToFile(active.id, uploads)
  }

  async function onDocx() {
    setBusyDocx(true)
    try {
      await downloadResidentDocx({
        file: active,
        clientLabel: project.clientLabel,
        managingAgents,
        masterlist,
        questions: questions.filter((q) => q.projectId === project.id),
        auditorName: auditor.name,
      })
    } finally {
      setBusyDocx(false)
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Audit Workbench
          </p>
          <h1 className="mt-1 max-w-md text-2xl font-semibold tracking-tight">
            <InlineText
              value={file.reference}
              ariaLabel="Resident file reference"
              className="text-2xl font-semibold"
              onCommit={(reference) =>
                updateFile(file.id, { reference: reference || file.reference })
              }
            />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-file resident bundle · Missing WR Gate · Deep extraction ·{" "}
            {project.clientLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RatingBadge rating={result.rating} />
          <RiskTierBadge tier={tier.id} label={`${score} · ${tier.label}`} />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => runDeepExtraction(file.id)}
          >
            <ScanSearch className="size-3.5" />
            Run deep extraction
          </Button>
          <Button
            className="gap-2"
            disabled={busyDocx}
            onClick={() => void onDocx()}
          >
            <FileDown className="size-3.5" />
            {busyDocx ? "Building…" : "Download .docx report"}
          </Button>
        </div>
      </div>

      <MissingItemsBanner />

      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-4 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-card",
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          void ingestBundle(Array.from(event.dataTransfer.files))
        }}
      >
        <span className="text-sm font-medium">
          Add files to this resident evidence bundle
        </span>
        <span className="text-xs text-muted-foreground">
          {(file.bundleFiles ?? []).length} file(s) attached · PDF / Word /
          images classified to WR-01–WR-22
        </span>
        <input
          type="file"
          multiple
          className="sr-only"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
          onChange={(event) => {
            void ingestBundle(Array.from(event.target.files ?? []))
            event.target.value = ""
          }}
        />
      </label>

      {(file.bundleFiles ?? []).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {(file.bundleFiles ?? []).map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs"
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground">{item.classifiedAs}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card className="shadow-sm ring-foreground/8">
            <CardHeader className="border-b">
              <CardTitle>Combined extract</CardTitle>
              <CardDescription>
                Text from every file in the resident bundle. Edit if OCR needs
                correction.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                aria-label="OCR extracted text"
                value={file.ocrText}
                onChange={(event) =>
                  updateFile(file.id, { ocrText: event.target.value })
                }
                className="min-h-72 font-mono text-xs leading-5"
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>Deep extraction preview</CardTitle>
              <CardDescription>
                Populates Word report boxes from WR-01, WR-02/07, WR-09, WR-11,
                and WR-13.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Which goals have been selected on the support plan?
                </p>
                <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">
                  {extraction.reportBoxes.selectedGoals}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  What support has been given for each current goal?
                </p>
                <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">
                  {extraction.reportBoxes.supportPerGoal}
                </pre>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Points of strength
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {(file.pointsOfStrength.length
                      ? file.pointsOfStrength
                      : extraction.qualitative.pointsOfStrength
                    ).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Next steps
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {(file.nextSteps.length
                      ? file.nextSteps
                      : extraction.qualitative.nextSteps
                    ).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  WR-02 / WR-07 vs MA rent schedule
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Rent {extraction.wr02.rentAmount ?? "—"} vs schedule{" "}
                  {extraction.wr02.scheduleRent ?? "—"} (match{" "}
                  {String(extraction.wr02.scheduleMatch)}) · Service{" "}
                  {extraction.wr07.serviceCharge ?? "—"} (match{" "}
                  {String(extraction.wr07.scheduleMatch)}) · Address check{" "}
                  {String(extraction.wr02.addressMatch)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:max-h-[calc(100svh-14rem)] lg:overflow-y-auto lg:pr-1">
          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>WR-01–WR-22 checklist</CardTitle>
              <CardDescription>
                Auto-mapped from the bundle classifier; toggle if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {residentDocuments.map((document) => (
                <label
                  key={document.code}
                  className="flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
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
                    <span className="font-medium">
                      {document.code} {document.title}
                    </span>
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>Rubric scores</CardTitle>
              <CardDescription>
                Project questions including bespoke RP checks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RubricEditor fileId={file.id} contained={false} />
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>5×5 risk matrix</CardTitle>
              <CardDescription>
                Likelihood × severity. Score ≥ 5 requires a WR-09 Risk
                Management Plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Likelihood</Label>
                <Select
                  value={String(file.likelihood)}
                  onValueChange={(value) => {
                    if (typeof value === "string") {
                      updateFile(file.id, { likelihood: Number(value) })
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue />
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
              <div>
                <Label>Severity</Label>
                <Select
                  value={String(file.severity)}
                  onValueChange={(value) => {
                    if (typeof value === "string") {
                      updateFile(file.id, { severity: Number(value) })
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue />
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
              <p className="sm:col-span-2 text-sm text-muted-foreground">
                Matrix {score}
                {planRequired
                  ? " — Risk Management Plan required."
                  : " — Plan not required at this score."}{" "}
                Form score {file.scoreOnForm}. Documents received{" "}
                {WR_CODES.filter((code) => file.received[code]).length}/
                {WR_CODES.length}.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>Support Delivered / Feedback</CardTitle>
              <CardDescription>
                {formatting[0] ?? "Formatting looks clean."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div>
                <Label htmlFor="support-delivered">Support Delivered</Label>
                <Textarea
                  id="support-delivered"
                  className="mt-1 min-h-28 text-sm"
                  value={file.supportDelivered}
                  onChange={(event) =>
                    updateFile(file.id, {
                      supportDelivered: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="feedback-support">Feedback on Support</Label>
                <Textarea
                  id="feedback-support"
                  className="mt-1 min-h-28 text-sm"
                  value={file.feedbackOnSupport}
                  onChange={(event) =>
                    updateFile(file.id, {
                      feedbackOnSupport: event.target.value,
                    })
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_CATEGORIES.map((category) => {
                  const active = file.feedbackCategories.includes(category)
                  return (
                    <button
                      key={category}
                      type="button"
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px]",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground",
                      )}
                      onClick={() =>
                        updateFile(file.id, {
                          feedbackCategories: active
                            ? file.feedbackCategories.filter(
                                (item) => item !== category,
                              )
                            : [...file.feedbackCategories, category],
                        })
                      }
                    >
                      {category}
                    </button>
                  )
                })}
              </div>
              <Button onClick={() => signOff(file.id)}>
                Sign off resident audit
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
