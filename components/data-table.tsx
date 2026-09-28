"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconExternalLink,
  IconLayoutColumns,
  IconLoader,
  IconSearch,
} from "@tabler/icons-react"
import {
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DashboardRow } from "@/utils/dashboardData"

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, DashboardRow>()

type View = "all" | "awaiting-payment" | "needs-judges" | "scored"

const VIEWS: { value: View; label: string; match: (row: DashboardRow) => boolean }[] = [
  { value: "all", label: "All", match: () => true },
  {
    value: "awaiting-payment",
    label: "Awaiting Payment",
    match: (row) => row.payment?.status !== "PAID",
  },
  {
    value: "needs-judges",
    label: "Needs Judges",
    match: (row) => row.judges.length === 0,
  },
  {
    value: "scored",
    label: "Scored",
    match: (row) => row.average_score !== null,
  },
]

const TYPE_LABELS = { THESIS: "Thesis", EBOOK: "E-book" } as const

function formatDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amount)
}

function registrationStatusVariant(
  status: DashboardRow["status"]
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ACCEPTED":
    case "COMPLETED":
      return "default"
    case "REJECTED":
      return "destructive"
    case "REVIEWING":
      return "secondary"
    default:
      return "outline"
  }
}

function PaymentBadge({ payment }: { payment: DashboardRow["payment"] }) {
  if (!payment) {
    return (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        No payment
      </Badge>
    )
  }
  return (
    <Badge
      variant={payment.status === "FAILED" ? "destructive" : "outline"}
      className="px-1.5 text-muted-foreground"
    >
      {payment.status === "PAID" ? (
        <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
      ) : payment.status === "PENDING" ? (
        <IconLoader />
      ) : null}
      {payment.status}
    </Badge>
  )
}

const columns = columnHelper.columns([
  columnHelper.accessor("registration_number", {
    header: "Registration",
    cell: ({ row }) => <TableCellViewer item={row.original} />,
    enableHiding: false,
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="max-w-48 px-1.5 text-muted-foreground"
        title={row.original.category}
      >
        <span className="truncate">{row.original.category}</span>
      </Badge>
    ),
  }),
  columnHelper.accessor("participant_name", {
    id: "participant",
    header: "Participant",
    cell: ({ row }) => (
      <div className="flex max-w-56 flex-col gap-0.5">
        <span className="truncate" title={row.original.participant_name}>
          {row.original.participant_name}
        </span>
        <span
          className="truncate text-xs text-muted-foreground"
          title={row.original.institution}
        >
          {row.original.institution}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.payment?.status ?? "NONE", {
    id: "payment",
    header: "Payment",
    cell: ({ row }) => <PaymentBadge payment={row.original.payment} />,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={registrationStatusVariant(row.original.status)}
        className="px-1.5"
      >
        {row.original.status}
      </Badge>
    ),
  }),
  columnHelper.accessor((row) => row.judges.length, {
    id: "judges",
    header: () => <div className="w-full text-right">Judges</div>,
    cell: ({ row }) => {
      const { judges } = row.original
      const scored = judges.filter((judge) => judge.submitted_at).length
      return (
        <div className="text-right tabular-nums">
          {judges.length === 0 ? (
            <span className="text-muted-foreground">Unassigned</span>
          ) : (
            `${scored}/${judges.length} scored`
          )}
        </div>
      )
    },
  }),
  columnHelper.accessor((row) => row.average_score ?? -1, {
    id: "avg score",
    header: () => <div className="w-full text-right">Avg Score</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.average_score === null
          ? "—"
          : row.original.average_score.toFixed(1)}
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.created_at ?? "", {
    id: "submitted",
    header: "Submitted",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.created_at)}
      </span>
    ),
  }),
])

export function DataTable({ data }: { data: DashboardRow[] }) {
  const [view, setView] = React.useState<View>("all")
  const [query, setQuery] = React.useState("")
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const counts = React.useMemo(
    () =>
      Object.fromEntries(
        VIEWS.map((item) => [item.value, data.filter(item.match).length])
      ) as Record<View, number>,
    [data]
  )

  const filtered = React.useMemo(() => {
    const match = VIEWS.find((item) => item.value === view)!.match
    const needle = query.trim().toLowerCase()
    return data.filter(
      (row) =>
        match(row) &&
        (!needle ||
          [
            row.registration_number,
            row.project_title,
            row.participant_name,
            row.institution,
            row.category,
          ].some((value) => value.toLowerCase().includes(needle)))
    )
  }, [data, view, query])

  const table = useTable({
    features,
    data: filtered,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  })

  function changeView(next: string) {
    setView(next as View)
    table.setPageIndex(0)
  }

  return (
    <Tabs
      value={view}
      onValueChange={changeView}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select value={view} onValueChange={changeView}>
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden"
            size="sm"
            id="view-selector"
          >
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            {VIEWS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label} ({counts[item.value]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
          {VIEWS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
              {item.value !== "all" && counts[item.value] > 0 ? (
                <Badge variant="secondary">{counts[item.value]}</Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                table.setPageIndex(0)
              }}
              placeholder="Search registrations…"
              className="h-8 w-48 pl-8 lg:w-56"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : (
                        <FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {data.length === 0
                      ? "No registrations yet."
                      : "No registrations match this view."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            Showing {filtered.length} of {data.length} registration
            {data.length === 1 ? "" : "s"}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.state.pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.state.pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.state.pagination.pageIndex + 1} of{" "}
              {Math.max(table.getPageCount(), 1)}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Tabs>
  )
}

const scoreChartConfig = {
  score: {
    label: "Score",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  )
}

function TableCellViewer({ item }: { item: DashboardRow }) {
  const isMobile = useIsMobile()
  const scoredJudges = item.judges
    .filter((judge) => judge.submitted_at)
    .map((judge) => ({ judge: judge.name, score: judge.total_score }))

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button
          variant="link"
          className="h-auto w-fit max-w-72 flex-col items-start gap-0.5 px-0 text-left text-foreground"
        >
          <span>{item.registration_number}</span>
          <span className="w-full truncate text-xs font-normal text-muted-foreground">
            {item.project_title}
          </span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.project_title}</DrawerTitle>
          <DrawerDescription>
            {item.registration_number} · {item.competition} · {item.category}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {scoredJudges.length > 0 ? (
            <>
              <ChartContainer config={scoreChartConfig}>
                <BarChart
                  accessibilityLayer
                  data={scoredJudges}
                  margin={{ left: 0, right: 10 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="judge"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar
                    dataKey="score"
                    fill="var(--color-score)"
                    radius={8}
                  />
                </BarChart>
              </ChartContainer>
              <div className="flex gap-2 leading-none font-medium">
                Average score {item.average_score?.toFixed(1)} from{" "}
                {scoredJudges.length} judge
                {scoredJudges.length === 1 ? "" : "s"}
              </div>
              <Separator />
            </>
          ) : null}

          <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">Abstract</span>
            <p className="whitespace-pre-line">{item.project_abstract}</p>
          </div>
          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Participant" value={item.participant_name} />
            <DetailField label="Email" value={item.participant_email} />
            <DetailField label="Phone" value={item.participant_phone} />
            <DetailField label="Education" value={item.education_level} />
            <DetailField label="Institution" value={item.institution} />
            <DetailField label="Country" value={item.country} />
            <DetailField label="Status" value={item.status} />
            <DetailField label="Submitted" value={formatDate(item.created_at)} />
          </div>
          <Separator />

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Payment</span>
            {item.payment ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PaymentBadge payment={item.payment} />
                  <span className="font-medium">
                    {formatCurrency(item.payment.amount)}
                  </span>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={item.payment.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconExternalLink />
                    Receipt
                  </a>
                </Button>
              </div>
            ) : (
              <span className="text-muted-foreground">
                No payment recorded yet
              </span>
            )}
          </div>
          <Separator />

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Judges</span>
            {item.judges.length === 0 ? (
              <span className="text-muted-foreground">No judges assigned</span>
            ) : (
              item.judges.map((judge, index) => (
                <div
                  key={`${judge.name}-${judge.type}-${index}`}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{judge.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {TYPE_LABELS[judge.type]} · {judge.status}
                    </span>
                  </div>
                  <span className="tabular-nums">
                    {judge.submitted_at ? judge.total_score : "Not scored"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
