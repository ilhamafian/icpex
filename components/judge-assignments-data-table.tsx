"use client";

import * as React from "react";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconSearch,
  IconUserPlus,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import type {
  JudgeAssignmentStatus,
  JudgeAssignmentType,
} from "@/schemas/judgeAssignmentsSchema";
import type { SerializedUser } from "@/types/user";
import { hasGrant } from "@/utils/roleGrants";
import type { AssignmentRegistrationOption } from "@/utils/assignmentOptions";
import type { SerializedJudgeAssignment } from "@/utils/serializeJudgeAssignment";

export type JudgeAssignmentRow = {
  registration: AssignmentRegistrationOption;
  assignments: SerializedJudgeAssignment[];
};

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, JudgeAssignmentRow>();

const TYPE_LABELS: Record<JudgeAssignmentType, string> = {
  THESIS: "Thesis",
  EBOOK: "E-book",
};

const TYPE_ROLE: Record<JudgeAssignmentType, "THESIS_JUDGE" | "EBOOK_JUDGE"> = {
  THESIS: "THESIS_JUDGE",
  EBOOK: "EBOOK_JUDGE",
};

function assignmentStatusVariant(
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

function registrationStatusVariant(
  status: AssignmentRegistrationOption["status"]
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ACCEPTED":
    case "COMPLETED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "REVIEWING":
      return "secondary";
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

export function judgeName(judge: SerializedUser | undefined, fallback: string) {
  if (!judge) return fallback;
  return judge.name || judge.email;
}

type JudgeAssignmentsDataTableProps = {
  data: JudgeAssignmentRow[];
  judges: SerializedUser[];
  /** Judges are offered only for roles held in this competition. */
  competitionId: string | null;
  busyKey?: string | null;
  onToggleJudge: (
    row: JudgeAssignmentRow,
    judge: SerializedUser,
    type: JudgeAssignmentType,
    assign: boolean
  ) => void;
};

export function assignmentKey(
  registrationNumber: string,
  judgeId: string,
  type: JudgeAssignmentType
) {
  return `${registrationNumber}:${judgeId}:${type}`;
}

export function JudgeAssignmentsDataTable({
  data,
  judges,
  competitionId,
  busyKey,
  onToggleJudge,
}: JudgeAssignmentsDataTableProps) {
  const [query, setQuery] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const judgesById = React.useMemo(
    () => new Map(judges.map((judge) => [judge._id, judge])),
    [judges]
  );

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data;
    return data.filter(({ registration, assignments }) =>
      [
        registration.registration_number,
        registration.project_title,
        registration.participant_name,
        registration.institution_name,
        ...assignments.map((item) =>
          judgeName(judgesById.get(item.judge_id), item.judge_id)
        ),
      ].some((value) => value.toLowerCase().includes(needle))
    );
  }, [data, query, judgesById]);

  const columns = React.useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => row.registration.registration_number, {
          id: "registration",
          header: "Registration",
          cell: ({ row }) => (
            <div className="flex max-w-72 flex-col gap-0.5">
              <span className="font-medium">
                {row.original.registration.registration_number}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {row.original.registration.project_title}
              </span>
            </div>
          ),
          enableHiding: false,
        }),
        columnHelper.accessor((row) => row.registration.participant_name, {
          id: "participant",
          header: "Participant",
          cell: ({ row }) => (
            <div className="flex flex-col gap-0.5">
              <span>{row.original.registration.participant_name}</span>
              <span className="text-muted-foreground text-xs">
                {row.original.registration.institution_name}
              </span>
            </div>
          ),
        }),
        columnHelper.accessor((row) => row.registration.status, {
          id: "status",
          header: "Status",
          cell: ({ row }) => (
            <Badge
              variant={registrationStatusVariant(
                row.original.registration.status
              )}
              className="px-1.5"
            >
              {row.original.registration.status}
            </Badge>
          ),
        }),
        columnHelper.accessor((row) => row.registration.created_at, {
          id: "submitted",
          header: "Submitted",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm">
              {formatDate(row.original.registration.created_at)}
            </span>
          ),
        }),
        columnHelper.accessor((row) => row.assignments.length, {
          id: "assigned to",
          header: "Assigned to",
          enableHiding: false,
          cell: ({ row }) => {
            const { registration, assignments } = row.original;
            return (
              <div className="flex flex-wrap items-center gap-1">
                {assignments.map((item) => (
                  <Badge
                    key={item._id}
                    variant={assignmentStatusVariant(item.status)}
                    className="px-1.5"
                    title={`${TYPE_LABELS[item.type]} · ${item.status}`}
                  >
                    {judgeName(judgesById.get(item.judge_id), item.judge_id)}
                    <span className="opacity-70">
                      · {TYPE_LABELS[item.type]}
                    </span>
                  </Badge>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 px-2"
                    >
                      <IconUserPlus />
                      {assignments.length === 0 ? "Assign" : null}
                      <span className="sr-only">
                        Assign judges to {registration.registration_number}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {(["THESIS", "EBOOK"] as const).map((type, index) => {
                      const role = TYPE_ROLE[type];
                      const assignedIds = new Set(
                        assignments
                          .filter((item) => item.type === type)
                          .map((item) => item.judge_id)
                      );
                      const options = judges.filter(
                        (judge) =>
                          hasGrant(judge.roles, role, competitionId) &&
                          (judge.status !== "DISABLED" ||
                            assignedIds.has(judge._id))
                      );
                      return (
                        <React.Fragment key={type}>
                          {index > 0 ? <DropdownMenuSeparator /> : null}
                          <DropdownMenuLabel>
                            {TYPE_LABELS[type]} judges
                          </DropdownMenuLabel>
                          {options.length === 0 ? (
                            <p className="text-muted-foreground px-3 pb-2 text-sm">
                              No {TYPE_LABELS[type].toLowerCase()} judges
                            </p>
                          ) : (
                            options.map((judge) => {
                              const key = assignmentKey(
                                registration.registration_number,
                                judge._id,
                                type
                              );
                              return (
                                <DropdownMenuCheckboxItem
                                  key={key}
                                  checked={assignedIds.has(judge._id)}
                                  disabled={busyKey === key}
                                  onSelect={(event) => event.preventDefault()}
                                  onCheckedChange={(checked) =>
                                    onToggleJudge(
                                      row.original,
                                      judge,
                                      type,
                                      checked === true
                                    )
                                  }
                                >
                                  <div className="flex min-w-0 flex-col">
                                    <span className="truncate">
                                      {judgeName(judge, judge._id)}
                                    </span>
                                    {judge.name ? (
                                      <span className="text-muted-foreground truncate text-xs font-normal">
                                        {judge.email}
                                      </span>
                                    ) : null}
                                  </div>
                                </DropdownMenuCheckboxItem>
                              );
                            })
                          )}
                        </React.Fragment>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        }),
      ]),
    [busyKey, competitionId, judges, judgesById, onToggleJudge]
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
    getRowId: (row) => row.registration.registration_number,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  const unassignedCount = data.filter(
    (row) => row.assignments.length === 0
  ).length;

  return (
    <div className="flex w-full flex-col justify-start gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <div>
          <h2 className="text-lg font-medium">Judge Assignments</h2>
          <p className="text-muted-foreground text-sm">
            Choose which thesis and e-book judges review each registration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                table.setPageIndex(0);
              }}
              placeholder="Search registrations…"
              className="h-8 w-56 pl-8"
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
            <TableHeader className="bg-muted sticky top-0 z-10">
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
                      : "No registrations match your search."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {data.length} registration{data.length === 1 ? "" : "s"} ·{" "}
            {unassignedCount} unassigned
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label
                htmlFor="assignments-rows-per-page"
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
                  id="assignments-rows-per-page"
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
                onClick={() =>
                  table.setPageIndex(table.getPageCount() - 1)
                }
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
