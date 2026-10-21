"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ClipboardList, Menu, Scale, Settings, ShieldCheck, UserRound } from "lucide-react"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useWorkbench } from "@/lib/store"
import { clientLabel } from "@/lib/text"
import { cn } from "cn"

const navigation = [
  { href: "/", label: "Caseload CRM Board", icon: ClipboardList },
  { href: "/workbench", label: "Audit Workbench", icon: Scale },
  { href: "/settings", label: "Workspace Settings", icon: Settings },
]

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-[#1c1f4a] text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-[#0073ea]">
          <ShieldCheck className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">Seaaudit</p>
          <p className="truncate text-xs text-indigo-100/80">Internal Workbench</p>
        </div>
      </div>
      <nav aria-label="Workbench" className="flex flex-1 flex-col gap-1 px-3">
        {navigation.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
                active ? "bg-[#0073ea] font-semibold text-white" : "text-indigo-100/85 hover:bg-white/10",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs font-semibold">On this workstation</p>
        <p className="mt-1 text-xs leading-5 text-indigo-100/75">
          Profile, managing agents, rent settings, and resident files are stored in local SQLite, with a browser copy in localStorage.
        </p>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, saving, error, clearError } = useWorkbench()
  const [menuOpen, setMenuOpen] = useState(false)
  const name = profile.name.trim()
  const role = profile.role.trim()
  const mark = initials(name)

  return (
    <div className="flex h-svh overflow-hidden bg-[#f3f5fb]">
      <aside className="hidden w-72 shrink-0 lg:block">
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-20 border-b border-slate-200 bg-white">
          <div className="h-1 bg-gradient-to-r from-[#0073ea] via-[#a25ddc] to-[#00c875]" />
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
                <SheetContent side="left" className="w-72 bg-[#1c1f4a] p-0 text-white sm:max-w-xs">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                  <SidebarNav onNavigate={() => setMenuOpen(false)} />
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.14em] text-[#0073ea] uppercase">
                  Client RP
                </p>
                <p className="truncate text-sm font-semibold text-[#1c1f4a]">
                  {clientLabel(profile.defaultClientRpName)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <span
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-xs font-bold whitespace-nowrap",
                  saving ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800",
                )}
              >
                {saving ? "Saving…" : "Saved on this workstation"}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-1.5 text-left hover:bg-slate-50"
                  aria-label="Your profile"
                >
                  <Avatar>
                    <AvatarFallback className="bg-[#0073ea] text-xs font-bold text-white">
                      {mark || <UserRound className="size-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block max-w-48 truncate text-sm leading-4 font-semibold text-[#1c1f4a]">
                      {name || "Add your name"}
                    </span>
                    <span className="block max-w-48 truncate text-xs text-slate-500">
                      {role || "Add your role in settings"}
                    </span>
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Your profile</DropdownMenuLabel>
                    <div className="px-2 py-2 text-sm">
                      <p className="font-semibold">{name || "Name not set"}</p>
                      <p className="text-slate-500">{role || "Role not set"}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {profile.email.trim() || "Email not set"}
                      </p>
                      <Link
                        href="/settings"
                        className="mt-3 inline-flex text-sm font-semibold text-[#0073ea] underline-offset-4 hover:underline"
                      >
                        Edit in Workspace Settings
                      </Link>
                    </div>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {error ? (
            <div className="flex items-center justify-between gap-4 bg-rose-50 px-4 py-2 text-sm text-rose-800 lg:px-6">
              <p>{error}</p>
              <button type="button" className="font-semibold whitespace-nowrap" onClick={clearError}>
                Dismiss
              </button>
            </div>
          ) : null}
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
