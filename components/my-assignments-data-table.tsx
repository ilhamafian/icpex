"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconClipboardCheck,
  IconEye,
  IconLayoutColumns,
  IconLoader,
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type {
  JudgeAssignmentStatus,
  JudgeAssignmentType,
} from "@/schemas/judgeAssignmentsSchema";
import type { AssignmentRegistrationOption } from "@/utils/assignmentOptions";
import type { SerializedJudgeAssignment } from "@/utils/serializeJudgeAssignment";

export type MyAssignmentRow = {
  assignment: SerializedJudgeAssignment;
  registration: AssignmentRegistrationOption | undefined;
};

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, MyAssignmentRow>();

type View = "all" | "pending" | "to-score" | "scored";

const VIEWS: {
  value: View;
  label: string;
  match: (row: MyAssignmentRow) => boolean;
}[] = [
  { value: "all", label: "All", match: () => true },
  {
    value: "pending",
    label: "Pending",
    match: (row) => row.assignment.status === "PENDING",
  },
  {
    value: "to-score",
    label: "To Score",
    match: (row) =>
      row.assignment.status === "ACCEPTED" && !row.assignment.submitted_at,
  },
  {
    value: "scored",
    label: "Scored",
    match: (row) => Boolean(row.assignment.submitted_at),
  },
];

export const TYPE_LABELS: Record<JudgeAssignmentType, string> = {
  THESIS: "Thesis",
  EBOOK: "E-book",
};

export function assignmentStatusVariant(
  status: JudgeAssignmentStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ACCEPTED":
      return "default";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type MyAssignmentsDataTableProps = {
  data: MyAssignmentRow[];
  showType: boolean;
  busyId?: string | null;
  onRespond: (
    assignment: SerializedJudgeAssignment,
    status: "ACCEPTED" | "REJECTED"
  ) => void;
};

export function MyAssignmentsDataTable({
  data,
  showType,
  busyId,
  onRespond,
}: MyAssignmentsDataTableProps) {
  const [view, setView] = React.useState<View>("all");
  const [query, setQuery] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const counts = React.useMemo(
    () =>
      Object.fromEntries(
        VIEWS.map((item) => [item.value, data.filter(item.match).length])
      ) as Record<View, number>,
    [data]
  );

  const filtered = React.useMemo(() => {
    const match = VIEWS.find((item) => item.value === view)!.match;
    const needle = query.trim().toLowerCase();
    return data.filter(
      (row) =>
        match(row) &&
        (!needle ||
          [
            row.assignment.registration_number,
            row.registration?.project_title ?? "",
            row.registration?.participant_name ?? "",
            row.registration?.institution_name ?? "",
          ].some((value) => value.toLowerCase().includes(needle)))
    );
  }, [data, view, query]);

  const columns = React.useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => row.assignment.registration_number, {
          id: "registration",
          header: "Registration",
          enableHiding: false,
          cell: ({ row }) => (
            <div className="flex max-w-72 flex-col gap-0.5">
              <Link
                href={`/portal/my-assignments/${row.original.assignment._id}`}
                className="font-medium hover:underline"
              >
                {row.original.assignment.registration_number}
              </Link>
              <span
                className="truncate text-xs text-muted-foreground"
                title={row.original.registration?.project_title}
              >
                {row.original.registration?.project_title ?? "Unknown project"}
              </span>
            </div>
          ),
        }),
        columnHelper.accessor(
          (row) => row.registration?.participant_name ?? "",
          {
            id: "participant",
            header: "Participant",
            cell: ({ row }) => (
              <div className="flex max-w-56 flex-col gap-0.5">
                <span className="truncate">
                  {row.original.registration?.participant_name ?? "—"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {row.original.registration?.institution_name}
                </span>
              </div>
            ),
          }
        ),
        ...(showType
          ? [
              columnHelper.accessor((row) => row.assignment.type, {
                id: "type",
                header: "Type",
                cell: ({ row }) => (
                  <Badge
                    variant="outline"
                    className="px-1.5 text-muted-foreground"
                  >
                    {TYPE_LABELS[row.original.assignment.type]}
                  </Badge>
                ),
              }),
            ]
          : []),
        columnHelper.accessor((row) => row.assignment.status, {
          id: "status",
          header: "Status",
          cell: ({ row }) => {
            const { assignment } = row.original;
            if (assignment.submitted_at) {
              return (
                <Badge variant="outline" className="px-1.5 text-muted-foreground">
                  <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
                  SCORED
                </Badge>
              );
            }
            return (
              <Badge
                variant={assignmentStatusVariant(assignment.status)}
                className="px-1.5"
              >
                {assignment.status === "ACCEPTED" ? <IconLoader /> : null}
                {assignment.status === "ACCEPTED"
                  ? "TO SCORE"
                  : assignment.status}
              </Badge>
            );
          },
        }),
        columnHelper.accessor(
          (row) =>
            row.assignment.submitted_at ? row.assignment.total_score : -1,
          {
            id: "score",
            header: () => <div className="w-full text-right">Score</div>,
            cell: ({ row }) => (
              <div className="text-right tabular-nums">
                {row.original.assignment.submitted_at
                  ? row.original.assignment.total_score
                  : "—"}
              </div>
            ),
          }
        ),
        columnHelper.accessor((row) => row.assignment.created_at ?? "", {
          id: "assigned",
          header: "Assigned",
          cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
              {formatDate(row.original.assignment.created_at)}
            </span>
          ),
        }),
        columnHelper.display({
          id: "actions",
          header: () => <div className="w-full text-right">Actions</div>,
          cell: ({ row }) => {
            const { assignment } = row.original;
            const href = `/portal/my-assignments/${assignment._id}`;
            const busy = busyId === assignment._id;
            return (
              <div className="flex items-center justify-end gap-2">
                {assignment.status === "PENDING" ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => onRespond(assignment, "REJECTED")}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onRespond(assignment, "ACCEPTED")}
                    >
                      Accept
                    </Button>
                  </>
                ) : null}
                {assignment.status === "ACCEPTED" ? (
                  <Button size="sm" asChild>
                    <Link href={href}>
                      <IconClipboardCheck />
                      {assignment.submitted_at ? "Edit scores" : "Assess"}
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={href}>
                      <IconEye />
                      View
                    </Link>
                  </Button>
                )}
              </div>
            );
          },
        }),
      ]),
    [busyId, onRespond, showType]
  );

  const table = useTable({
    features,
    data: filtered,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.assignment._id,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  function changeView(next: string) {
    setView(next as View);
    table.setPageIndex(0);
  }

  return (
    <Tabs
      value={view}
      onValueChange={changeView}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex flex-col gap-1 px-4 lg:px-6">
        <h2 className="text-lg font-medium">My Assignments</h2>
        <p className="text-sm text-muted-foreground">
          Accept or reject assigned registrations, then open each one to read
          the submission and score it.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        <Label htmlFor="assignment-view" className="sr-only">
          View
        </Label>
        <Select value={view} onValueChange={changeView}>
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden"
            size="sm"
            id="assignment-view"
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
              placeholder="Search assignments…"
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
                      ? "No assignments yet."
                      : "No assignments match this view."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            Showing {filtered.length} of {data.length} assignment
            {data.length === 1 ? "" : "s"}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label
                htmlFor="my-assignments-rows-per-page"
                className="text-sm font-medium"
              >
                Rows per page
              </Label>
              <Select
                value={`${table.state.pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-20"
                  id="my-assignments-rows-per-page"
                >
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
                className="hidden size-8 lg:flex"
                size="icon"
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
  );
}
