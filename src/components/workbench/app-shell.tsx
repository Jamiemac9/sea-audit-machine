"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Archive,
  ClipboardList,
  FileSearch,
  Files,
  LayoutGrid,
  ListChecks,
  Menu,
  Settings,
  ShieldCheck,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AGENT_TOKEN, CLIENT_TOKEN } from "@/lib/documents"
import { useWorkbench } from "@/lib/workbench"
import { cn } from "cn"

const navigation = [
  { href: "/", label: "Audit project", icon: ClipboardList },
  { href: "/audit", label: "Resident file", icon: FileSearch },
  { href: "/documents", label: "Document suite", icon: Files },
  { href: "/risk", label: "Risk matrix", icon: LayoutGrid },
  { href: "/rubric", label: "Rubric settings", icon: ListChecks },
  { href: "/reports", label: "Report package", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            Seaaudit
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Internal Workbench
          </p>
        </div>
      </div>
      <nav aria-label="Workbench" className="flex flex-1 flex-col gap-1 px-3">
        <p className="px-3 pb-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Workspace
        </p>
        {navigation.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "border-transparent text-sidebar-foreground/80 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-xs font-medium">Workstation copy</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Resident files stay on this machine. Reports use {CLIENT_TOKEN} and{" "}
          {AGENT_TOKEN}.
        </p>
      </div>
    </div>
  )
}

function FileSelect() {
  const { files, file, setFileId } = useWorkbench()
  if (!file) {
    return (
      <p className="text-sm text-muted-foreground">No resident file in this project</p>
    )
  }

  return (
    <Select
      value={file.id}
      onValueChange={(value) => {
        if (typeof value === "string") setFileId(value)
      }}
    >
      <SelectTrigger
        className="w-full min-w-0 bg-background sm:w-72"
        aria-label="Active resident file"
      >
        <SelectValue>
          {(value) => {
            const selected = files.find((item) => item.id === value)
            return selected
              ? `${selected.reference} · ${selected.managingAgent}`
              : "Select a file"
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {files.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.reference} · {item.managingAgent}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { secureMode, file, project } = useWorkbench()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-20 border-b border-border bg-card">
          <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div className="flex items-center gap-3">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      className="lg:hidden"
                      aria-label="Open navigation"
                    />
                  }
                >
                  <Menu />
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 sm:max-w-xs">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                  <SidebarNav onNavigate={() => setMenuOpen(false)} />
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Active context
                </p>
                <p className="truncate text-sm font-medium">
                  {project.clientLabel}
                  <span className="px-1.5 text-muted-foreground">/</span>
                  {AGENT_TOKEN}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {project.name}
                  {file?.managingAgent ? ` · ${file.managingAgent}` : ""}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              <FileSelect />
              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <div
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium ring-1 ring-inset",
                    secureMode
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-600/15"
                      : "bg-amber-50 text-amber-900 ring-amber-600/20",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      secureMode ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                  {secureMode
                    ? "Local Secure Mode: Active"
                    : "Local Secure Mode: Inactive"}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex h-10 items-center gap-2 rounded-lg px-1.5 text-left hover:bg-muted"
                    aria-label="User profile"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        AO
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden min-w-0 sm:block">
                      <span className="block text-sm leading-4 font-medium">
                        Amara Okonkwo
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Head of Internal Audit
                      </span>
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Local session</DropdownMenuLabel>
                      <div className="px-1.5 py-1.5 text-sm">
                        <p className="font-medium">Amara Okonkwo</p>
                        <p className="text-muted-foreground">
                          Head of Internal Audit
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          amara.okonkwo@audit.local
                        </p>
                      </div>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
