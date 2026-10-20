"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { rubricDomains } from "@/lib/audit"
import { useWorkbench } from "@/lib/workbench"

export function RubricView() {
  const { clientName } = useWorkbench()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Standards
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Audit rubric
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Evidence expected when scoring statutory housing compliance for{" "}
          {clientName}. Weights show where a gap moves the assurance opinion.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {rubricDomains.map((domain) => (
          <Card key={domain.id} className="shadow-sm ring-foreground/8">
            <CardHeader className="border-b">
              <CardTitle>{domain.name}</CardTitle>
              <CardDescription>{domain.basis}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-4">
              {domain.criteria.map((criterion) => (
                <div key={criterion.name}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{criterion.name}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {criterion.weight}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {criterion.evidence}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
