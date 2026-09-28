"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type { DashboardChartPoint } from "@/utils/dashboardData"

const chartConfig = {
  registrations: {
    label: "Registrations",
    color: "var(--primary)",
  },
  payments: {
    label: "Payments",
    color: "var(--primary)",
  },
} satisfies ChartConfig

const RANGE_DAYS: Record<string, number> = {
  "90d": 90,
  "30d": 30,
  "7d": 7,
}

const RANGE_LABELS: Record<string, string> = {
  "90d": "the last 3 months",
  "30d": "the last 30 days",
  "7d": "the last 7 days",
}

function parseDay(value: string) {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function formatDay(value: string) {
  return parseDay(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export function ChartAreaInteractive({
  data,
}: {
  data: DashboardChartPoint[]
}) {
  const isMobile = useIsMobile()
  const [selectedRange, setTimeRange] = React.useState<string | null>(null)
  const timeRange = selectedRange ?? (isMobile ? "7d" : "90d")

  const filteredData = data.slice(-(RANGE_DAYS[timeRange] ?? 90))
  const totals = filteredData.reduce(
    (acc, point) => ({
      registrations: acc.registrations + point.registrations,
      payments: acc.payments + point.payments,
    }),
    { registrations: 0, payments: 0 }
  )

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Registrations &amp; Payments</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {totals.registrations} registrations and {totals.payments} payments
            in {RANGE_LABELS[timeRange]}
          </span>
          <span className="@[540px]/card:hidden">
            {totals.registrations} registrations · {totals.payments} payments
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => {
              if (value) setTimeRange(value)
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a range"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillRegistrations" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-registrations)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-registrations)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPayments" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-payments)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-payments)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatDay}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDay(String(value))}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="payments"
              type="natural"
              fill="url(#fillPayments)"
              stroke="var(--color-payments)"
            />
            <Area
              dataKey="registrations"
              type="natural"
              fill="url(#fillRegistrations)"
              stroke="var(--color-registrations)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
