"use client";

import * as React from "react";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconArrowsSort,
  IconDownload,
  IconFilter,
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
import type { PaymentStatus } from "@/schemas/paymentSchema";
import type { UserRole } from "@/schemas/userRole";
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
  JTEC: "JTEC",
};

const TYPE_ROLE: Record<JudgeAssignmentType, UserRole> = {
  THESIS: "THESIS_JUDGE",
  EBOOK: "EBOOK_JUDGE",
  JTEC: "JTEC_JUDGE",
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

type RegistrationStatus = AssignmentRegistrationOption["status"];
type PaymentFilter = PaymentStatus | "NONE";
type AssignmentFilter = "ASSIGNED" | "UNASSIGNED";

const REGISTRATION_STATUSES: RegistrationStatus[] = [
  "SUBMITTED",
  "REVIEWING",
  "ACCEPTED",
  "REJECTED",
  "COMPLETED",
];

const PAYMENT_FILTERS: { value: PaymentFilter; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "NONE", label: "No payment" },
];

const ASSIGNMENT_FILTERS: { value: AssignmentFilter; label: string }[] = [
  { value: "ASSIGNED", label: "Has judges" },
  { value: "UNASSIGNED", label: "No judges yet" },
];

type FullPaperFilter = "UPLOADED" | "NONE";

const FULL_PAPER_FILTERS: { value: FullPaperFilter; label: string }[] = [
  { value: "UPLOADED", label: "Uploaded" },
  { value: "NONE", label: "Not uploaded" },
];

const SORT_OPTIONS = {
  newest: "Newest first",
  oldest: "Oldest first",
  registration: "Registration number",
  participant: "Participant (A–Z)",
  institution: "Institution (A–Z)",
  status: "Registration status",
  payment: "Payment status",
  fewestJudges: "Fewest judges first",
} as const;

type SortOption = keyof typeof SORT_OPTIONS;

const PAYMENT_ORDER: Record<PaymentFilter, number> = {
  PAID: 0,
  PENDING: 1,
  FAILED: 2,
  NONE: 3,
};

function paymentFilterValue(row: JudgeAssignmentRow): PaymentFilter {
  return row.registration.payment_status ?? "NONE";
}

function compareRows(
  a: JudgeAssignmentRow,
  b: JudgeAssignmentRow,
  sortBy: SortOption
) {
  const ra = a.registration;
  const rb = b.registration;
  switch (sortBy) {
    case "newest":
      return (rb.created_at ?? "").localeCompare(ra.created_at ?? "");
    case "oldest":
      return (ra.created_at ?? "").localeCompare(rb.created_at ?? "");
    case "registration":
      return ra.registration_number.localeCompare(rb.registration_number, undefined, {
        numeric: true,
      });
    case "participant":
      return ra.participant_name.localeCompare(rb.participant_name);
    case "institution":
      return ra.institution_name.localeCompare(rb.institution_name);
    case "status":
      return (
        REGISTRATION_STATUSES.indexOf(ra.status) -
        REGISTRATION_STATUSES.indexOf(rb.status)
      );
    case "payment":
      return PAYMENT_ORDER[paymentFilterValue(a)] - PAYMENT_ORDER[paymentFilterValue(b)];
    case "fewestJudges":
      return a.assignments.length - b.assignments.length;
  }
}

function toggleIn<T>(set: Set<T>, value: T, on: boolean) {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
}

const DOCUMENTS_ZIP_URL = "/api/registration-documents";

function documentsZipUrl(registrationNumber: string) {
  return `${DOCUMENTS_ZIP_URL}?${new URLSearchParams({
    registration: registrationNumber,
  })}`;
}

function paymentStatusVariant(
  status: PaymentStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "PAID":
      return "default";
    case "FAILED":
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
  const [statusFilter, setStatusFilter] = React.useState<
    Set<RegistrationStatus>
  >(() => new Set());
  const [paymentFilter, setPaymentFilter] = React.useState<Set<PaymentFilter>>(
    () => new Set()
  );
  const [assignmentFilter, setAssignmentFilter] = React.useState<
    Set<AssignmentFilter>
  >(() => new Set());
  const [fullPaperFilter, setFullPaperFilter] = React.useState<
    Set<FullPaperFilter>
  >(() => new Set());
  const [sortBy, setSortBy] = React.useState<SortOption>("newest");
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
    return data
      .filter((row) => {
        const { registration, assignments } = row;
        if (statusFilter.size && !statusFilter.has(registration.status)) {
          return false;
        }
        if (paymentFilter.size && !paymentFilter.has(paymentFilterValue(row))) {
          return false;
        }
        if (
          assignmentFilter.size &&
          !assignmentFilter.has(assignments.length ? "ASSIGNED" : "UNASSIGNED")
        ) {
          return false;
        }
        if (
          fullPaperFilter.size &&
          !fullPaperFilter.has(registration.has_full_paper ? "UPLOADED" : "NONE")
        ) {
          return false;
        }
        if (!needle) return true;
        return [
          registration.registration_number,
          registration.project_title,
          registration.participant_name,
          registration.institution_name,
          ...assignments.map((item) =>
            judgeName(judgesById.get(item.judge_id), item.judge_id)
          ),
        ].some((value) => value.toLowerCase().includes(needle));
      })
      .sort((a, b) => compareRows(a, b, sortBy));
  }, [
    data,
    query,
    judgesById,
    statusFilter,
    paymentFilter,
    assignmentFilter,
    fullPaperFilter,
    sortBy,
  ]);

  const activeFilterCount =
    statusFilter.size +
    paymentFilter.size +
    assignmentFilter.size +
    fullPaperFilter.size;

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
        columnHelper.accessor((row) => row.registration.payment_status ?? "", {
          id: "payment",
          header: () => <div className="w-full text-center">Payment</div>,
          cell: ({ row }) => {
            const status = row.original.registration.payment_status;
            return (
              <div className="flex justify-center">
                {status ? (
                  <Badge
                    variant={paymentStatusVariant(status)}
                    className="w-20 justify-center px-1.5"
                  >
                    {status}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    No payment
                  </span>
                )}
              </div>
            );
          },
        }),
        columnHelper.accessor((row) => row.registration.has_full_paper, {
          id: "full paper",
          header: () => <div className="w-full text-center">Full paper</div>,
          cell: ({ row }) => (
            <div className="flex justify-center">
              <Badge
                variant={
                  row.original.registration.has_full_paper ? "default" : "outline"
                }
                className="w-20 justify-center px-1.5"
              >
                {row.original.registration.has_full_paper
                  ? "UPLOADED"
                  : "NONE"}
              </Badge>
            </div>
          ),
        }),
        columnHelper.accessor((row) => row.registration.document_count, {
          id: "documents",
          header: () => <div className="w-full text-center">Documents</div>,
          cell: ({ row }) => {
            const { registration_number, document_count } =
              row.original.registration;
            const label = `Download documents for ${registration_number}`;
            return (
              <div className="flex justify-center">
                {document_count ? (
                  <Button variant="outline" size="sm" className="h-7" asChild>
                    <a
                      href={documentsZipUrl(registration_number)}
                      download
                      title={label}
                    >
                      <IconDownload />
                      Zip
                      <span className="sr-only">{label}</span>
                    </a>
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-sm">None</span>
                )}
              </div>
            );
          },
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
                    {(["THESIS", "EBOOK", "JTEC"] as const).map((type, index) => {
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
            Choose which thesis, e-book and JTEC judges review each registration.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
                <IconFilter />
                Filter
                {activeFilterCount ? (
                  <Badge variant="secondary" className="px-1.5">
                    {activeFilterCount}
                  </Badge>
                ) : null}
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Registration status</DropdownMenuLabel>
              {REGISTRATION_STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  className="capitalize"
                  checked={statusFilter.has(status)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) => {
                    setStatusFilter((prev) => toggleIn(prev, status, checked === true));
                    table.setPageIndex(0);
                  }}
                >
                  {status.toLowerCase()}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Payment</DropdownMenuLabel>
              {PAYMENT_FILTERS.map(({ value, label }) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={paymentFilter.has(value)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) => {
                    setPaymentFilter((prev) => toggleIn(prev, value, checked === true));
                    table.setPageIndex(0);
                  }}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Judges</DropdownMenuLabel>
              {ASSIGNMENT_FILTERS.map(({ value, label }) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={assignmentFilter.has(value)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) => {
                    setAssignmentFilter((prev) =>
                      toggleIn(prev, value, checked === true)
                    );
                    table.setPageIndex(0);
                  }}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Full paper</DropdownMenuLabel>
              {FULL_PAPER_FILTERS.map(({ value, label }) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={fullPaperFilter.has(value)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) => {
                    setFullPaperFilter((prev) =>
                      toggleIn(prev, value, checked === true)
                    );
                    table.setPageIndex(0);
                  }}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
              {activeFilterCount ? (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setStatusFilter(new Set());
                      setPaymentFilter(new Set());
                      setAssignmentFilter(new Set());
                      setFullPaperFilter(new Set());
                      table.setPageIndex(0);
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value as SortOption);
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger size="sm" className="w-52" aria-label="Sort by">
              <IconArrowsSort />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {(Object.keys(SORT_OPTIONS) as SortOption[]).map((option) => (
                <SelectItem key={option} value={option}>
                  {SORT_OPTIONS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                      : "No registrations match your search or filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex flex-1 items-center gap-3">
            {data.length > 0 ? (
              <Button variant="outline" size="sm" asChild>
                <a href={DOCUMENTS_ZIP_URL} download>
                  <IconDownload />
                  Download all documents
                </a>
              </Button>
            ) : null}
            <span className="text-muted-foreground hidden text-sm lg:inline">
              {data.length} registration{data.length === 1 ? "" : "s"} ·{" "}
              {unassignedCount} unassigned
            </span>
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
