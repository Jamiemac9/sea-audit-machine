"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { FolderKanban, Menu, Scale, Settings, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "cn"

const navigation = [
  { href: "/", label: "Rounds", icon: FolderKanban },
  { href: "/audit-rubric", label: "Rating key", icon: Scale },
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
            Support Audit
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Resident file workbench
          </p>
        </div>
      </div>
      <nav aria-label="Workbench" className="flex flex-1 flex-col gap-1 px-3">
        <p className="px-3 pb-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Workspace
        </p>
        {navigation.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
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
                  : "border-transparent text-sidebar-foreground/80 hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-xs font-medium">Local only</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Resident documents are stored outside this project and never leave
          this machine.
        </p>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-20 border-b border-border bg-card lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
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
            <p className="text-sm font-semibold">Support Audit</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
