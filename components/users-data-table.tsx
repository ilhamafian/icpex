"use client";

import * as React from "react";
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconFilter,
  IconLayoutColumns,
  IconLoader,
  IconMailForward,
  IconPlus,
  IconSearch,
  IconTrash,
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
  DropdownMenuItem,
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
import { COMPETITION_ELIGIBILITY_LABELS } from "@/schemas/educationLevel";
import type { UserRole, UserStatus } from "@/schemas/userSchema";
import type { SerializedUser } from "@/types/user";
import { hasGrant, rolesForCompetition } from "@/utils/roleGrants";

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, SerializedUser>();

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  SECRETARY: "Secretary",
  JUDGE_LEADER: "Judge Leader",
  THESIS_JUDGE: "Thesis Judge",
  JTEC_JUDGE: "JTEC Judge",
};

const USER_STATUSES: UserStatus[] = ["ACTIVE", "INVITED", "DISABLED"];

const ROLE_OPTIONS: UserRole[] = [
  "ADMIN",
  "SECRETARY",
  "JUDGE_LEADER",
  "THESIS_JUDGE",
  "JTEC_JUDGE",
];

type VerifiedFilter = "yes" | "no";

const VERIFIED_FILTERS: { value: VerifiedFilter; label: string }[] = [
  { value: "yes", label: "Verified" },
  { value: "no", label: "Not verified" },
];

const SORT_OPTIONS = {
  newest: "Newest first",
  oldest: "Oldest first",
  email: "Email (A–Z)",
  name: "Name (A–Z)",
  status: "Status",
} as const;

type SortOption = keyof typeof SORT_OPTIONS;

const STATUS_ORDER: Record<UserStatus, number> = {
  ACTIVE: 0,
  INVITED: 1,
  DISABLED: 2,
};

function statusVariant(
  status: UserStatus
): "default" | "secondary" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "INVITED":
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

function toggleIn<T>(set: Set<T>, value: T, on: boolean) {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
}

function compareUsers(a: SerializedUser, b: SerializedUser, sortBy: SortOption) {
  switch (sortBy) {
    case "newest":
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    case "oldest":
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    case "email":
      return a.email.localeCompare(b.email);
    case "name":
      return (a.name ?? a.email).localeCompare(b.name ?? b.email);
    case "status":
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  }
}

export function roleToggleKey(userId: string, role: UserRole) {
  return `${userId}:${role}`;
}

type UsersDataTableProps = {
  data: SerializedUser[];
  /** Roles are shown for this competition (plus global ADMIN). */
  competitionId: string | null;
  toolbar?: React.ReactNode;
  onAddUser: () => void;
  onToggleRole: (
    user: SerializedUser,
    role: UserRole,
    assign: boolean
  ) => void;
  onResendInvite: (user: SerializedUser) => void;
  onDeleteUser: (user: SerializedUser) => void;
  busyId?: string | null;
  busyKey?: string | null;
};

export function UsersDataTable({
  data,
  competitionId,
  toolbar,
  onAddUser,
  onToggleRole,
  onResendInvite,
  onDeleteUser,
  busyId,
  busyKey,
}: UsersDataTableProps) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<Set<UserStatus>>(
    () => new Set()
  );
  const [roleFilter, setRoleFilter] = React.useState<Set<UserRole>>(
    () => new Set()
  );
  const [verifiedFilter, setVerifiedFilter] = React.useState<
    Set<VerifiedFilter>
  >(() => new Set());
  const [sortBy, setSortBy] = React.useState<SortOption>("newest");

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data
      .filter((user) => {
        if (statusFilter.size && !statusFilter.has(user.status)) {
          return false;
        }
        if (roleFilter.size) {
          const roles = rolesForCompetition(user.roles, competitionId);
          if (![...roleFilter].some((role) => roles.includes(role))) {
            return false;
          }
        }
        if (verifiedFilter.size) {
          const key: VerifiedFilter = user.email_verified ? "yes" : "no";
          if (!verifiedFilter.has(key)) return false;
        }
        if (!needle) return true;
        const email = user.email.toLowerCase();
        const name = user.name?.toLowerCase() ?? "";
        return email.includes(needle) || name.includes(needle);
      })
      .sort((a, b) => compareUsers(a, b, sortBy));
  }, [
    data,
    query,
    statusFilter,
    roleFilter,
    verifiedFilter,
    sortBy,
    competitionId,
  ]);

  const activeFilterCount =
    statusFilter.size + roleFilter.size + verifiedFilter.size;

  const hasActiveFilters = activeFilterCount > 0 || Boolean(query.trim());

  const columns = React.useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "index",
          header: "#",
          enableSorting: false,
          enableHiding: false,
          cell: ({ row }) => (
            <span className="tabular-nums text-muted-foreground">
              {pagination.pageIndex * pagination.pageSize + row.index + 1}
            </span>
          ),
        }),
        columnHelper.accessor("email", {
          header: "Email",
          cell: ({ row }) => (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{row.original.email}</span>
              {row.original.name ? (
                <span className="text-muted-foreground text-xs">
                  {row.original.name}
                </span>
              ) : null}
              {row.original.judge_profile ? (
                <span className="text-muted-foreground text-xs">
                  {row.original.judge_profile.institution.name}
                  {" · "}
                  {
                    COMPETITION_ELIGIBILITY_LABELS[
                      row.original.judge_profile.education_eligibility
                    ]
                  }
                </span>
              ) : null}
            </div>
          ),
          enableHiding: false,
        }),
        columnHelper.accessor("roles", {
          header: "Role",
          enableHiding: false,
          cell: ({ row }) => {
            const user = row.original;
            const roles = rolesForCompetition(user.roles, competitionId);
            const onlyRole = user.roles.length <= 1;
            return (
              <div className="flex flex-wrap items-center gap-1">
                {roles.map((role) => (
                  <Badge key={role} variant="outline" className="px-1.5">
                    {ROLE_LABELS[role] ?? role}
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
                      {roles.length === 0 ? "Assign" : null}
                      <span className="sr-only">
                        Assign roles to {user.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Roles</DropdownMenuLabel>
                    {ROLE_OPTIONS.map((role) => {
                      const assigned = hasGrant(user.roles, role, competitionId);
                      const key = roleToggleKey(user._id, role);
                      const needsCompetition = role !== "ADMIN";
                      const blocked =
                        (needsCompetition && !competitionId) ||
                        (assigned && onlyRole);
                      return (
                        <DropdownMenuCheckboxItem
                          key={role}
                          checked={assigned}
                          disabled={busyKey === key || blocked}
                          onSelect={(event) => event.preventDefault()}
                          onCheckedChange={(checked) =>
                            onToggleRole(user, role, checked === true)
                          }
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{ROLE_LABELS[role]}</span>
                            {assigned && onlyRole ? (
                              <span className="text-muted-foreground text-xs font-normal">
                                Keep at least one role
                              </span>
                            ) : needsCompetition && !competitionId ? (
                              <span className="text-muted-foreground text-xs font-normal">
                                Select a competition first
                              </span>
                            ) : null}
                          </div>
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: ({ row }) => (
            <Badge
              variant={statusVariant(row.original.status)}
              className="px-1.5"
            >
              {row.original.status === "INVITED" ? (
                <IconLoader className="size-3.5" />
              ) : row.original.status === "ACTIVE" ? (
                <IconCircleCheckFilled className="size-3.5 fill-green-500 dark:fill-green-400" />
              ) : null}
              {row.original.status}
            </Badge>
          ),
        }),
        columnHelper.accessor("email_verified", {
          id: "verified",
          header: "Verified",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm">
              {row.original.email_verified ? "Yes" : "No"}
            </span>
          ),
        }),
        columnHelper.accessor("created_at", {
          id: "created",
          header: "Created",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm">
              {formatDate(row.original.created_at)}
            </span>
          ),
        }),
        columnHelper.display({
          id: "actions",
          cell: ({ row }) => {
            const user = row.original;
            const isBusy = busyId === user._id;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
                    size="icon"
                    disabled={isBusy}
                  >
                    <IconDotsVertical />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {user.status === "INVITED" ? (
                    <DropdownMenuItem
                      onClick={() => onResendInvite(user)}
                      disabled={isBusy}
                    >
                      <IconMailForward className="size-4" />
                      Resend invite
                    </DropdownMenuItem>
                  ) : null}
                  {user.status === "INVITED" ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDeleteUser(user)}
                    disabled={isBusy}
                  >
                    <IconTrash className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
        }),
      ]),
    [
      busyId,
      busyKey,
      competitionId,
      onDeleteUser,
      onResendInvite,
      onToggleRole,
      pagination.pageIndex,
      pagination.pageSize,
    ]
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
    getRowId: (row) => row._id,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  return (
    <div className="flex w-full flex-col justify-start gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <div>
          <h2 className="text-lg font-medium">Users</h2>
          <p className="text-muted-foreground text-sm">
            Invite internal users and manage their roles per competition.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                table.setPageIndex(0);
              }}
              placeholder="Search name or email…"
              aria-label="Search users by name or email"
              className="h-8 w-48 pl-8 lg:w-64"
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
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {USER_STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.has(status)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) => {
                    setStatusFilter((prev) =>
                      toggleIn(prev, status, checked === true)
                    );
                    table.setPageIndex(0);
                  }}
                >
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Role</DropdownMenuLabel>
              {ROLE_OPTIONS.map((role) => (
                <DropdownMenuCheckboxItem
                  key={role}
                  checked={roleFilter.has(role)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) => {
                    setRoleFilter((prev) =>
                      toggleIn(prev, role, checked === true)
                    );
                    table.setPageIndex(0);
                  }}
                >
                  {ROLE_LABELS[role]}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Email verified</DropdownMenuLabel>
              {VERIFIED_FILTERS.map(({ value, label }) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={verifiedFilter.has(value)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) => {
                    setVerifiedFilter((prev) =>
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
                      setRoleFilter(new Set());
                      setVerifiedFilter(new Set());
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
            <SelectTrigger size="sm" className="w-44" aria-label="Sort by">
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
          {toolbar}
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
          <Button variant="outline" size="sm" onClick={onAddUser}>
            <IconPlus />
            <span className="hidden lg:inline">Add User</span>
            <span className="lg:hidden">Add</span>
          </Button>
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
                    {hasActiveFilters
                      ? "No users match the current search or filters."
                      : "No users yet. Invite someone to get started."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {hasActiveFilters
              ? `Showing ${filtered.length} of ${data.length} user${data.length === 1 ? "" : "s"}`
              : `${filtered.length} user${filtered.length === 1 ? "" : "s"}`}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="users-rows-per-page" className="text-sm font-medium">
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
                  id="users-rows-per-page"
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

export { ROLE_LABELS };
