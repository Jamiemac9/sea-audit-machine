"use client"

import { useState } from "react"
import {
  Files,
  FolderPlus,
  Gauge,
  Phone,
  Upload,
  Users,
} from "lucide-react"
import { AssurancePill } from "@/components/workbench/assurance-pill"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ASSURANCE_RATINGS,
  assuranceForScore,
  formatAuditDateTime,
  formatCount,
  formatScore,
  managingAgents,
} from "@/lib/audit"
import { useWorkbench } from "@/lib/workbench"

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Files
}) {
  return (
    <Card size="sm" className="shadow-sm ring-foreground/8">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-2 text-primary">
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function NewProjectDialog() {
  const { schemes, schemeId, addProject } = useWorkbench()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [selectedScheme, setSelectedScheme] = useState(
    schemeId === "all" ? schemes[0]?.id ?? "" : schemeId
  )
  const [agentId, setAgentId] = useState(managingAgents[0].id)
  const [files, setFiles] = useState("0")
  const [score, setScore] = useState("80")
  const [error, setError] = useState("")

  const numericScore = Number(score)
  const preview =
    Number.isFinite(numericScore) && numericScore >= 0 && numericScore <= 100
      ? assuranceForScore(numericScore)
      : null

  function reset() {
    setName("")
    setFiles("0")
    setScore("80")
    setError("")
    setSelectedScheme(schemeId === "all" ? schemes[0]?.id ?? "" : schemeId)
    setAgentId(managingAgents[0].id)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) reset()
      }}
    >
      <DialogTrigger render={<Button className="w-full justify-center" />}>
        <FolderPlus />
        New Audit Project
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New audit project</DialogTitle>
          <DialogDescription>
            Opens a local fieldwork record for the active client. Nothing is
            sent off this workstation.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const fileCount = Number(files)
            const complianceScore = Number(score)
            if (name.trim().length < 3) {
              setError("Enter a project name of at least 3 characters.")
              return
            }
            if (!selectedScheme) {
              setError("Choose a scheme.")
              return
            }
            if (!Number.isInteger(fileCount) || fileCount < 0) {
              setError("Files audited must be a whole number.")
              return
            }
            if (
              !Number.isFinite(complianceScore) ||
              complianceScore < 0 ||
              complianceScore > 100
            ) {
              setError("Compliance score must be between 0 and 100.")
              return
            }
            addProject({
              name,
              schemeId: selectedScheme,
              managingAgentId: agentId,
              filesAudited: fileCount,
              complianceScore,
            })
            setOpen(false)
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Communal alarm test"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="project-scheme">Scheme</Label>
            <Select
              value={selectedScheme}
              onValueChange={(value) => {
                if (typeof value === "string") setSelectedScheme(value)
              }}
            >
              <SelectTrigger id="project-scheme" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {schemes.map((scheme) => (
                  <SelectItem key={scheme.id} value={scheme.id}>
                    {scheme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="project-agent">Managing agent</Label>
            <Select
              value={agentId}
              onValueChange={(value) => {
                if (typeof value === "string") setAgentId(value)
              }}
            >
              <SelectTrigger id="project-agent" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {managingAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="project-files">Files audited</Label>
              <Input
                id="project-files"
                inputMode="numeric"
                value={files}
                onChange={(event) => setFiles(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="project-score">Compliance score</Label>
              <Input
                id="project-score"
                inputMode="decimal"
                value={score}
                onChange={(event) => setScore(event.target.value)}
              />
            </div>
          </div>
          {preview ? (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="text-xs text-muted-foreground">
                Resulting opinion
              </span>
              <AssurancePill rating={preview} />
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit">Create project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UploadDialog() {
  const { projects, uploadBatch } = useWorkbench()
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")
  const [fileNames, setFileNames] = useState<string[]>([])
  const [error, setError] = useState("")

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setProjectId(projects[0]?.id ?? "")
          setFileNames([])
          setError("")
        }
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" className="w-full justify-center" />}
      >
        <Upload />
        Upload Batch
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload batch</DialogTitle>
          <DialogDescription>
            Attach evidence already stored on this workstation to an open
            project.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!projectId) {
              setError("Choose a project in the current scope.")
              return
            }
            if (fileNames.length === 0) {
              setError("Choose at least one file.")
              return
            }
            uploadBatch({ projectId, fileNames })
            setOpen(false)
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="upload-project">Project</Label>
            <Select
              value={projectId}
              onValueChange={(value) => {
                if (typeof value === "string") setProjectId(value)
              }}
            >
              <SelectTrigger id="upload-project" className="w-full">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="upload-files">Evidence files</Label>
            <Input
              id="upload-files"
              type="file"
              multiple
              onChange={(event) =>
                setFileNames(
                  Array.from(event.target.files ?? []).map((file) => file.name)
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              {fileNames.length === 0
                ? "No files selected."
                : `${fileNames.length} file${fileNames.length === 1 ? "" : "s"} selected.`}
            </p>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={projects.length === 0}>
              Add to project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DashboardView() {
  const { clientName, schemeName, projects, activities, metrics, schemes } =
    useWorkbench()
  const schemeById = new Map(
    schemes.map((scheme) => [scheme.id, scheme.name])
  )
  const agentById = new Map(
    managingAgents.map((agent) => [agent.id, agent.name])
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Statutory compliance for {clientName}, {schemeName}. Q3 2026 cycle,
          prepared for housing executive reporting.
        </p>
      </div>

      <section
        aria-label="Key metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Total Files Audited"
          value={formatCount(metrics.filesAudited)}
          detail={`${formatCount(metrics.projectCount)} project${metrics.projectCount === 1 ? "" : "s"} in this scope.`}
          icon={Files}
        />
        <MetricCard
          label="Average Compliance Score"
          value={
            metrics.averageScore === null
              ? "—"
              : formatScore(metrics.averageScore)
          }
          detail="Mean score across projects in the selected scheme."
          icon={Gauge}
        />
        <MetricCard
          label="Active Managing Agents"
          value={formatCount(metrics.activeAgents)}
          detail="Providers with fieldwork that is still open."
          icon={Users}
        />
        <MetricCard
          label="Pending Remediation Calls"
          value={formatCount(metrics.pendingCalls)}
          detail="Open calls with third-party managing agents."
          icon={Phone}
        />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
        <Card className="shadow-sm ring-foreground/8">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Active audit projects</CardTitle>
                <CardDescription>
                  Assurance opinion for each open and closed file in scope.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ASSURANCE_RATINGS.map((rating) => (
                  <AssurancePill key={rating} rating={rating} />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {projects.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                No audit projects in this scheme yet. Open a project from the
                actions panel.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Managing agent</TableHead>
                    <TableHead className="text-right">Files</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Assurance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.status}
                        </p>
                      </TableCell>
                      <TableCell>
                        {schemeById.get(project.schemeId) ?? project.schemeId}
                      </TableCell>
                      <TableCell>
                        {agentById.get(project.managingAgentId) ??
                          project.managingAgentId}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCount(project.filesAudited)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {project.complianceScore}
                      </TableCell>
                      <TableCell>
                        <AssurancePill rating={project.assurance} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>
                Start fieldwork or attach a local evidence batch.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <NewProjectDialog />
              <UploadDialog />
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-foreground/8">
            <CardHeader>
              <CardTitle>Recent audit activity</CardTitle>
              <CardDescription>
                Latest evidence and review notes in this scope.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity recorded for this scheme.
                </p>
              ) : (
                <ol className="flex flex-col">
                  {activities.slice(0, 6).map((activity, index) => (
                    <li
                      key={activity.id}
                      className="relative flex gap-3 pb-4 last:pb-0"
                    >
                      {index < Math.min(activities.length, 6) - 1 ? (
                        <span className="absolute top-3 left-[5px] h-[calc(100%-4px)] w-px bg-border" />
                      ) : null}
                      <span className="relative mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                          {activity.detail}
                        </p>
                        <p className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                          {formatAuditDateTime(activity.at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
