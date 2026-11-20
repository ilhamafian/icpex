"use client";

import * as React from "react";
import {
  IconChevronDown,
  IconLayoutColumns,
  IconSearch,
} from "@tabler/icons-react";
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
} from "@tanstack/react-table";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { PortalTableFooter } from "@/components/portal-table-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatScore } from "@/utils/formatScore";
import type { JudgeDistributionRow } from "@/utils/judgeLeaderReports";

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<
  typeof features,
  JudgeDistributionRow
>();

const chartConfig = {
  participants: {
    label: "Participants",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

type View = "all" | "assigned" | "idle";

const VIEWS: {
  value: View;
  label: string;
  match: (row: JudgeDistributionRow) => boolean;
}[] = [
  { value: "all", label: "All", match: () => true },
  {
    value: "assigned",
    label: "Has participants",
    match: (row) => row.participant_count > 0,
  },
  {
    value: "idle",
    label: "No participants",
    match: (row) => row.participant_count === 0,
  },
];

function mean(values: number[]) {
  if (values.length === 0) return null;
  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 100
    ) / 100
  );
}

function DistributionSummary({
  rows,
  unassignedParticipants,
}: {
  rows: JudgeDistributionRow[];
  unassignedParticipants: number;
}) {
  const withParticipants = rows.filter(
    (row) => row.participant_count > 0
  ).length;
  const average = mean(rows.map((row) => row.participant_count));
  const busiest = rows.reduce(
    (max, row) => Math.max(max, row.participant_count),
    0
  );
  const busiestNames = rows
    .filter((row) => row.participant_count === busiest && busiest > 0)
    .map((row) => row.name);

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Judges</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {rows.length.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          {withParticipants.toLocaleString()} with at least one participant
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Unassigned participants</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {unassignedParticipants.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          No active judge yet
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Average load</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {average === null ? "—" : formatScore(average)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          Participants per judge, including zeros
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Busiest judge</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {busiest.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          <span className="line-clamp-2">
            {busiestNames.length
              ? busiestNames.join(", ")
              : "No participants assigned"}
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}

function JudgeAxisTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value?: unknown };
}) {
  const full = String(payload?.value ?? "");
  const text = full.length > 22 ? `${full.slice(0, 21)}…` : full;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      className="fill-muted-foreground"
      fontSize={12}
    >
      <title>{full}</title>
      {text}
    </text>
  );
}

function chartLabel(row: JudgeDistributionRow, nameCounts: Map<string, number>) {
  if ((nameCounts.get(row.name) ?? 0) > 1 && row.email) {
    return `${row.name} (${row.email})`;
  }
  return row.name;
}

function DistributionChart({ rows }: { rows: JudgeDistributionRow[] }) {
  const nameCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
    }
    return counts;
  }, [rows]);

  const plotted = React.useMemo(
    () =>
      [...rows]
        .sort(
          (a, b) =>
            b.participant_count - a.participant_count ||
            a.name.localeCompare(b.name)
        )
        .map((row) => ({
          judge: chartLabel(row, nameCounts),
          participants: row.participant_count,
        })),
    [rows, nameCounts]
  );

  if (rows.length === 0) return null;

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle>Participants per judge</CardTitle>
        <CardDescription>
          Each bar is the number of participants assigned to that judge.
          Declined assignments are left out.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[480px] overflow-y-auto">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: Math.max(220, plotted.length * 36) }}
          >
            <BarChart
              accessibilityLayer
              data={plotted}
              layout="vertical"
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="judge"
                type="category"
                width={168}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                tick={JudgeAxisTick}
              />
              <XAxis
                dataKey="participants"
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar
                dataKey="participants"
                fill="var(--color-participants)"
                radius={4}
                barSize={16}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function JudgeDrawer({ item }: { item: JudgeDistributionRow }) {
  const isMobile = useIsMobile();
  const active = item.participants.filter(
    (participant) => participant.status !== "REJECTED"
  );
  const declined = item.participants.filter(
    (participant) => participant.status === "REJECTED"
  );

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button
          variant="link"
          className="h-auto w-fit max-w-64 flex-col items-start gap-0.5 px-0 text-left text-foreground"
        >
          <span className="truncate">{item.name}</span>
          <span className="w-full truncate text-xs font-normal text-muted-foreground">
            {item.email || "No email"}
          </span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.name}</DrawerTitle>
          <DrawerDescription>
            {`${item.participant_count} participant${
              item.participant_count === 1 ? "" : "s"
            }${
              item.declined_count > 0
                ? ` · ${item.declined_count} declined`
                : ""
            }`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {item.institution ? (
            <p className="text-muted-foreground">{item.institution}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Count label="Scored" value={item.scored_count} />
            <Count label="Awaiting" value={item.awaiting_count} />
          </div>
          {active.length === 0 ? (
            <p className="text-muted-foreground">
              No participants are assigned to this judge.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {active.map((participant) => (
                <ParticipantLine
                  key={participant.registration_number}
                  participant={participant}
                />
              ))}
            </ul>
          )}
          {declined.length > 0 ? (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-muted-foreground">Declined</span>
              <ul className="flex flex-col gap-3">
                {declined.map((participant) => (
                  <ParticipantLine
                    key={participant.registration_number}
                    participant={participant}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ParticipantLine({
  participant,
}: {
  participant: JudgeDistributionRow["participants"][number];
}) {
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="font-medium">{participant.registration_number}</span>
        <span className="truncate">{participant.participant_name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {participant.project_title || "Untitled project"}
        </span>
      </div>
      <span className="shrink-0 tabular-nums">
        {participant.status === "REJECTED"
          ? "Declined"
          : participant.submitted
            ? formatScore(participant.total_score)
            : "Not scored"}
      </span>
    </li>
  );
}

function CountCell({ value }: { value: number }) {
  return (
    <div className="text-right tabular-nums">
      {value === 0 ? (
        <span className="text-muted-foreground">0</span>
      ) : (
        value.toLocaleString()
      )}
    </div>
  );
}

function createColumns(pageIndex: number, pageSize: number) {
  return columnHelper.columns([
    columnHelper.display({
      id: "index",
      header: "#",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {pageIndex * pageSize + row.index + 1}
        </span>
      ),
    }),
    columnHelper.accessor("name", {
      id: "judge",
      header: "Judge",
      enableHiding: false,
      cell: ({ row }) => <JudgeDrawer item={row.original} />,
    }),
    columnHelper.accessor("institution", {
      header: "Institution",
      cell: ({ row }) => (
        <span
          className="block max-w-48 truncate text-sm"
          title={row.original.institution}
        >
          {row.original.institution || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("participant_count", {
      id: "participants",
      header: () => <div className="w-full text-right">Participants</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {row.original.participant_count.toLocaleString()}
        </div>
      ),
    }),
    columnHelper.accessor("scored_count", {
      id: "scored",
      header: () => <div className="w-full text-right">Scored</div>,
      cell: ({ row }) => <CountCell value={row.original.scored_count} />,
    }),
    columnHelper.accessor("awaiting_count", {
      id: "awaiting",
      header: () => <div className="w-full text-right">Awaiting</div>,
      cell: ({ row }) => <CountCell value={row.original.awaiting_count} />,
    }),
  ]);
}

export function JudgeDistributionView({
  competitionName,
  rows,
  unassignedParticipants,
}: {
  competitionName: string | null;
  rows: JudgeDistributionRow[];
  unassignedParticipants: number;
}) {
  const [view, setView] = React.useState<View>("all");
  const [query, setQuery] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "participants", desc: true },
  ]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const counts = React.useMemo(
    () =>
      Object.fromEntries(
        VIEWS.map((item) => [item.value, rows.filter(item.match).length])
      ) as Record<View, number>,
    [rows]
  );

  const filtered = React.useMemo(() => {
    const match = VIEWS.find((item) => item.value === view)!.match;
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        match(row) &&
        (!needle ||
          [
            row.name,
            row.email,
            row.institution,
            ...row.participants.flatMap((participant) => [
              participant.registration_number,
              participant.participant_name,
              participant.project_title,
            ]),
          ].some((value) => value.toLowerCase().includes(needle)))
    );
  }, [rows, view, query]);

  const columns = React.useMemo(
    () => createColumns(pagination.pageIndex, pagination.pageSize),
    [pagination.pageIndex, pagination.pageSize]
  );

  const table = useTable({
    features,
    data: filtered,
    columns,
    state: { sorting, columnVisibility, pagination },
    getRowId: (row) => row.judge_id,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  function changeView(next: string) {
    setView(next as View);
    table.setPageIndex(0);
  }

  if (!competitionName) {
    return (
      <div className="px-4 lg:px-6">
        <p className="text-sm text-muted-foreground">
          Publish a competition to view judge distribution.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <DistributionSummary
        rows={rows}
        unassignedParticipants={unassignedParticipants}
      />
      <DistributionChart rows={rows} />
      <Tabs
        value={view}
        onValueChange={changeView}
        className="w-full flex-col justify-start gap-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
          <Label htmlFor="distribution-view" className="sr-only">
            View
          </Label>
          <Select value={view} onValueChange={changeView}>
            <SelectTrigger
              className="flex w-fit @4xl/main:hidden"
              size="sm"
              id="distribution-view"
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
                  setQuery(event.target.value);
                  table.setPageIndex(0);
                }}
                placeholder="Search judges"
                aria-label="Search judges"
                className="h-8 w-48 pl-8 lg:w-64"
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
                {table.getRowModel().rows.length ? (
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
                      {rows.length === 0
                        ? "No judges on this track yet."
                        : "No judges match this view."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <PortalTableFooter
            id="distribution-rows-per-page"
            filteredCount={filtered.length}
            totalCount={rows.length}
            noun="judge"
            pageIndex={table.state.pagination.pageIndex}
            pageSize={table.state.pagination.pageSize}
            pageCount={table.getPageCount()}
            canPrevious={table.getCanPreviousPage()}
            canNext={table.getCanNextPage()}
            onPageSize={(size) => table.setPageSize(size)}
            onFirst={() => table.setPageIndex(0)}
            onPrevious={() => table.previousPage()}
            onNext={() => table.nextPage()}
            onLast={() => table.setPageIndex(table.getPageCount() - 1)}
          />
        </div>
      </Tabs>
    </div>
  );
}
