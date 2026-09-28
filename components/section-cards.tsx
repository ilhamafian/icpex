import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardStats } from "@/utils/dashboardData"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amount)
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function SectionCards({ stats }: { stats: DashboardStats }) {
  const registrationChange = percentChange(
    stats.registrationsThisMonth,
    stats.registrationsLastMonth
  )
  const registrationsUp = registrationChange >= 0
  const judgingProgress = stats.totalAssignments
    ? Math.round((stats.submittedAssignments / stats.totalAssignments) * 100)
    : 0
  const awaitingVerification = stats.pendingPayments

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Registrations</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalRegistrations.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {registrationsUp ? <IconTrendingUp /> : <IconTrendingDown />}
              {registrationsUp ? "+" : ""}
              {registrationChange.toFixed(0)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.registrationsThisMonth} new this month
            {registrationsUp ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            {stats.registrationsLastMonth} last month
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Verified Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(stats.revenue)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconCircleCheck />
              {stats.paidCount} paid
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            From payments marked as paid
          </div>
          <div className="text-muted-foreground">
            {stats.withoutPayment} registration
            {stats.withoutPayment === 1 ? "" : "s"} without a payment
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Awaiting Verification</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {awaitingVerification.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {stats.failedPayments > 0 ? <IconAlertTriangle /> : <IconClock />}
              {stats.failedPayments} failed
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {awaitingVerification > 0
              ? "Receipts need checking"
              : "All receipts checked"}
            <IconClock className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Pending payments for the secretary to review
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Judging Progress</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {judgingProgress}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconCircleCheck />
              {stats.submittedAssignments}/{stats.totalAssignments}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Assignments scored by judges
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {stats.unassignedRegistrations} registration
            {stats.unassignedRegistrations === 1 ? "" : "s"} without judges
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
