import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RatingPill } from "@/components/workbench/rating-pill"
import {
  MINIMUM_ACTIVE_GOALS,
  MINIMUM_WEEKLY_SUPPORT_MINS,
  RATINGS,
  RATING_DEFINITION,
  RMP_THRESHOLD,
  WR_CODES,
} from "@/lib/audit"

/**
 * The rating key and thresholds, shown so they are never guessed at. This is a
 * reference view; it reads nothing from the database.
 */
export function RubricView() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Standards
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Rating key and thresholds
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          The document position and the support position are reached separately,
          and the support position decides how far the rating drops. The
          application never computes a rating.
        </p>
      </div>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Bands</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          {RATINGS.map((rating) => (
            <div key={rating} className="flex flex-col gap-1.5 sm:flex-row sm:gap-4">
              <div className="sm:w-32 sm:shrink-0">
                <RatingPill rating={rating} />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {RATING_DEFINITION[rating]}
              </p>
            </div>
          ))}
          <div className="border-t pt-4 text-sm leading-6 text-muted-foreground">
            <p>
              Missing or unsigned documents plus a clear record of real support
              is Amber, not Red. A complete document set with no meaningful
              support is Red, whatever the paperwork looks like. Documentation
              findings alone never take a file to Red.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm ring-foreground/8">
          <CardHeader className="border-b">
            <CardTitle>Thresholds the checks apply</CardTitle>
            <CardDescription>
              Eligibility and safety minimums, applied per resident file.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="font-medium">Active support goals</dt>
                <dd className="text-muted-foreground">
                  At least {MINIMUM_ACTIVE_GOALS} at all times, each with an
                  action plan.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Weekly support</dt>
                <dd className="text-muted-foreground">
                  A minimum of {MINIMUM_WEEKLY_SUPPORT_MINS} minutes of relevant
                  support per resident per week. Room checks are welfare checks
                  and do not count towards it.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Risk Management Plan</dt>
                <dd className="text-muted-foreground">
                  Required for any risk scored {RMP_THRESHOLD} or above;
                  specific, operational and non-judgemental.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Risk scoring</dt>
                <dd className="text-muted-foreground">
                  Likelihood × severity, both 1–5. Bands: 1–4 Low, 5–9 Medium,
                  10–16 High, 20–25 Extremely High / Critical. Any score that is
                  not a product of 1–5 × 1–5 is impossible on the matrix.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Reviews</dt>
                <dd className="text-muted-foreground">
                  At 3, 6 and 9 months from move-in, and reported only once due.
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-sm ring-foreground/8">
          <CardHeader className="border-b">
            <CardTitle>Document codes recognised</CardTitle>
            <CardDescription>
              The Windrush Support Pack scheme. These are one provider&apos;s
              references, not a sector standard — commissioned work is audited
              against the client&apos;s own pack.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {WR_CODES.map((item) => (
                <div key={item.code} className="flex gap-2">
                  <dt className="font-medium">{item.code}</dt>
                  <dd className="text-muted-foreground">{item.name}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
