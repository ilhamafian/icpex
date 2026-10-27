"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  IconArrowBackUp,
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconBell,
  IconCheck,
  IconDeviceFloppy,
  IconDotsVertical,
  IconMail,
  IconReceipt,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from "@tabler/icons-react";
import {
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  FlexRender,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EDUCATION_LEVEL_LABELS,
  type EducationLevel,
} from "@/schemas/educationLevel";
import type { PaymentStatus } from "@/schemas/paymentSchema";
import type { Registration } from "@/schemas/registrationSchema";
import { CURRENCIES, formatMoney, type Currency } from "@/utils/registrationFee";
import { PAYMENT_STATUS_LABELS } from "@/utils/paymentStatusLabel";
import type { SubmissionPaymentGroup } from "@/utils/submissionPayments";

type PaymentTab = "REVIEW" | "AWAITING" | "PENDING" | "PAID" | "FAILED";
type RegistrationStatus = Registration["status"];
type AdjustmentType = "UNDERPAID" | "OVERPAID";
type AdjustmentDraft = {
  groupId: string;
  submissionNumber: string;
  type: AdjustmentType;
  amount: string;
  currency: Currency;
};

type PaymentRow = {
  id: string;
  group: SubmissionPaymentGroup;
  registration: SubmissionPaymentGroup["projects"][number]["registration"];
  payment: SubmissionPaymentGroup["projects"][number]["payment"];
  institution: string;
  education_level: EducationLevel;
  created_at: string;
  paymentTab: PaymentTab;
};

const TAB_LABELS: Record<PaymentTab, string> = {
  REVIEW: "To review",
  AWAITING: "Awaiting payment",
  PENDING: "To verify",
  PAID: "Paid",
  FAILED: "Failed",
};

const EDUCATION_TABS: EducationLevel[] = ["UNDERGRADUATE", "POSTGRADUATE"];

const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, PaymentRow>();

function groupTab(group: SubmissionPaymentGroup): PaymentTab {
  const statuses = group.projects.map(
    (project) => project.payment?.status ?? "REVIEW"
  );
  if (statuses.some((status) => status === "PENDING")) return "PENDING";
  if (statuses.length > 0 && statuses.every((status) => status === "PAID")) {
    return "PAID";
  }
  if (statuses.some((status) => status === "FAILED")) return "FAILED";
  if (statuses.some((status) => status === "AWAITING")) return "AWAITING";
  return "REVIEW";
}

function paymentStatusVariant(
  status: PaymentStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "PAID":
      return "default";
    case "FAILED":
      return "destructive";
    case "AWAITING":
    case "PENDING":
      return "secondary";
    default:
      return "outline";
  }
}

const REGISTRATION_STATUSES: {
  value: RegistrationStatus;
  label: string;
  dot: string;
}[] = [
  { value: "SUBMITTED", label: "Submitted", dot: "bg-muted-foreground/60" },
  { value: "REVIEWING", label: "Reviewing", dot: "bg-amber-500" },
  { value: "ACCEPTED", label: "Accepted", dot: "bg-emerald-500" },
  { value: "REJECTED", label: "Rejected", dot: "bg-destructive" },
  { value: "COMPLETED", label: "Completed", dot: "bg-sky-500" },
];

function RowActionsMenu({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={disabled}
          aria-label={label}
          className="text-muted-foreground"
        >
          <IconDotsVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string") return data.error;
    return "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

function projectAmount(
  project: SubmissionPaymentGroup["projects"][number],
  drafts: Record<string, string>
) {
  const raw =
    drafts[project.registration._id] ??
    String(project.payment?.amount ?? project.registration.fee ?? 0);
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : null;
}

function groupDraftTotal(
  group: SubmissionPaymentGroup,
  drafts: Record<string, string>
) {
  return group.projects.reduce<number | null>((sum, project) => {
    if (sum === null) return null;
    const amount = projectAmount(project, drafts);
    if (amount === null) return null;
    return sum + amount;
  }, 0);
}

function formatDay(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function formatCreated(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function flattenGroups(groups: SubmissionPaymentGroup[]): PaymentRow[] {
  const rows: PaymentRow[] = [];
  for (const group of groups) {
    const paymentTab = groupTab(group);
    for (const project of group.projects) {
      rows.push({
        id: project.registration._id,
        group,
        registration: project.registration,
        payment: project.payment,
        institution:
          group.submission?.institution_name ??
          project.registration.participant.institution.name,
        education_level: project.registration.participant.education_level,
        created_at: project.registration.created_at ?? "",
        paymentTab,
      });
    }
  }
  return rows;
}

function SortableHeader({
  canSort,
  isSorted,
  onSort,
  title,
}: {
  canSort: boolean;
  isSorted: false | "asc" | "desc";
  onSort?: ((event: unknown) => void) | undefined;
  title: string;
}) {
  if (!canSort) return <span>{title}</span>;
  return (
    <button
      type="button"
      className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted"
      onClick={onSort}
    >
      <span>{title}</span>
      {isSorted === "asc" ? (
        <IconSortAscending className="size-3.5" />
      ) : isSorted === "desc" ? (
        <IconSortDescending className="size-3.5" />
      ) : (
        <IconArrowsSort className="size-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

export function PaymentVerificationManager({
  initialGroups = [],
}: {
  initialGroups?: SubmissionPaymentGroup[];
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [educationLevel, setEducationLevel] =
    useState<EducationLevel>("UNDERGRADUATE");
  const [tab, setTab] = useState<PaymentTab>("REVIEW");
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "university", desc: false },
  ]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState<AdjustmentDraft | null>(null);

  const allRows = useMemo(() => flattenGroups(groups), [groups]);

  const eduRows = useMemo(
    () => allRows.filter((row) => row.education_level === educationLevel),
    [allRows, educationLevel]
  );

  const paymentCounts = useMemo(() => {
    const counts: Record<PaymentTab, number> = {
      REVIEW: 0,
      AWAITING: 0,
      PENDING: 0,
      PAID: 0,
      FAILED: 0,
    };
    for (const row of eduRows) counts[row.paymentTab] += 1;
    return counts;
  }, [eduRows]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return eduRows.filter((row) => {
      if (row.paymentTab !== tab) return false;
      if (!needle) return true;
      return [
        row.registration.registration_number,
        row.registration.project.title,
        row.registration.participant.name,
        row.registration.participant.email,
        row.institution,
        row.group.submission?.submission_number ?? "",
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [eduRows, tab, query]);

  function replaceGroup(next: SubmissionPaymentGroup) {
    setGroups((prev) => prev.map((group) => (group.id === next.id ? next : group)));
    setDrafts((prev) => {
      const copy = { ...prev };
      for (const project of next.projects) delete copy[project.registration._id];
      return copy;
    });
  }

  async function refreshGroup(group: SubmissionPaymentGroup) {
    if (!group.submission) {
      const projects = await Promise.all(
        group.projects.map(async (project) => {
          const res = await fetch(`/api/registrations/${project.registration._id}`);
          if (!res.ok) return project;
          return (await res.json()) as SubmissionPaymentGroup["projects"][number];
        })
      );
      replaceGroup({ ...group, projects });
      return;
    }

    const res = await fetch(`/api/submissions/${group.submission._id}`);
    if (!res.ok) {
      toast.error(await readError(res));
      return;
    }
    const data = (await res.json()) as { group: SubmissionPaymentGroup };
    replaceGroup(data.group);
  }

  function draftFees(group: SubmissionPaymentGroup) {
    const fees: { registration_id: string; amount: number }[] = [];
    for (const project of group.projects) {
      const amount = projectAmount(project, drafts);
      if (amount === null || amount < 0) return null;
      fees.push({
        registration_id: project.registration._id,
        amount: Math.round(amount * 100) / 100,
      });
    }
    return fees;
  }

  async function saveFees(group: SubmissionPaymentGroup) {
    if (!group.submission) return false;
    const fees = draftFees(group);
    if (!fees) {
      toast.error("Enter a valid fee for every project.");
      return false;
    }

    try {
      const res = await fetch(`/api/submissions/${group.submission._id}/fees`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fees }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return false;
      }
      const data = (await res.json()) as { group: SubmissionPaymentGroup };
      replaceGroup(data.group);
      return true;
    } catch {
      toast.error("Failed to save prices.");
      return false;
    }
  }

  async function sendPaymentRequest(group: SubmissionPaymentGroup) {
    if (!group.submission) return;
    const fees = draftFees(group);
    if (!fees) {
      toast.error("Enter a valid fee for every project.");
      return;
    }
    const total = fees.reduce((sum, fee) => sum + fee.amount, 0);

    setBusyId(group.id);
    try {
      const res = await fetch(
        `/api/submissions/${group.submission._id}/payment-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fees }),
        }
      );
      const data = (await res.json().catch(() => null)) as {
        error?: unknown;
        warning?: string;
        group?: SubmissionPaymentGroup;
      } | null;
      if (!res.ok) {
        toast.error(
          typeof data?.error === "string"
            ? data.error
            : "Failed to send the payment request."
        );
        return;
      }
      if (data?.group) replaceGroup(data.group);
      else await refreshGroup(group);
      if (data?.warning) toast.warning(data.warning);
      toast.success(
        total === 0
          ? "Marked as no charge and emailed the participants."
          : "Payment request sent."
      );
    } catch {
      toast.error("Failed to send the payment request.");
    } finally {
      setBusyId(null);
    }
  }

  async function resendPaymentRequest(group: SubmissionPaymentGroup) {
    if (!group.submission) return;
    setBusyId(group.id);
    try {
      const res = await fetch(
        `/api/submissions/${group.submission._id}/payment-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }
      );
      const data = (await res.json().catch(() => null)) as {
        error?: unknown;
        warning?: string;
        group?: SubmissionPaymentGroup;
      } | null;
      if (!res.ok) {
        toast.error(
          typeof data?.error === "string"
            ? data.error
            : "Failed to resend the payment request."
        );
        return;
      }
      if (data?.group) replaceGroup(data.group);
      if (data?.warning) toast.warning(data.warning);
      toast.success("Payment request resent.");
    } catch {
      toast.error("Failed to resend the payment request.");
    } finally {
      setBusyId(null);
    }
  }

  async function submissionAction(
    group: SubmissionPaymentGroup,
    path: "verify" | "payment-reminder",
    body: Record<string, unknown>,
    success: string
  ) {
    if (!group.submission) return false;
    setBusyId(group.id);
    try {
      const res = await fetch(`/api/submissions/${group.submission._id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: unknown;
        warning?: string;
        group?: SubmissionPaymentGroup | null;
      } | null;
      if (!res.ok) {
        toast.error(
          typeof data?.error === "string" ? data.error : "Something went wrong."
        );
        return false;
      }
      if (data?.group) replaceGroup(data.group);
      else await refreshGroup(group);
      toast.success(success);
      if (data?.warning) toast.warning(data.warning);
      return true;
    } catch {
      toast.error("Something went wrong.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function verify(group: SubmissionPaymentGroup, outcome: "PAID" | "FAILED") {
    if (!group.submission) {
      void setPaymentStatus(group, outcome);
      return;
    }
    void submissionAction(
      group,
      "verify",
      { outcome },
      outcome === "PAID"
        ? "Marked as paid. Invoice emailed to the participants."
        : "Payment marked as failed."
    );
  }

  async function confirmAdjustment() {
    if (!adjustment) return;
    const amount = Number(adjustment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an amount above zero.");
      return;
    }
    const target = groups.find((group) => group.id === adjustment.groupId);
    if (!target) return;
    const done = await submissionAction(
      target,
      "verify",
      {
        outcome: adjustment.type,
        amount: Math.round(amount * 100) / 100,
        currency: adjustment.currency,
      },
      adjustment.type === "UNDERPAID"
        ? "Marked as underpaid. The participant was emailed the balance and payment link."
        : "Marked as paid with an overpayment. Invoice and refund note emailed."
    );
    if (done) setAdjustment(null);
  }

  async function setPaymentStatus(
    group: SubmissionPaymentGroup,
    status: PaymentStatus
  ) {
    const payment = group.projects.find((project) => project.payment)?.payment;
    if (!payment) return;
    setBusyId(group.id);
    try {
      const res = await fetch(`/api/payments/${payment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      await refreshGroup(group);
      toast.success(
        status === "PAID"
          ? "Payment verified as paid."
          : status === "FAILED"
            ? "Payment marked as failed."
            : "Payment reopened."
      );
    } catch {
      toast.error("Failed to update payment status.");
    } finally {
      setBusyId(null);
    }
  }

  async function setRegistrationStatus(
    group: SubmissionPaymentGroup,
    registrationId: string,
    status: RegistrationStatus
  ) {
    setBusyId(group.id);
    try {
      const res = await fetch(`/api/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      await refreshGroup(group);
      toast.success("Registration status updated.");
    } catch {
      toast.error("Failed to update registration.");
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "index",
          header: "#",
          enableSorting: false,
          cell: ({ row, table }) => (
            <span className="tabular-nums text-muted-foreground">
              {table.getRowModel().rows.findIndex((r) => r.id === row.id) + 1}
            </span>
          ),
        }),
        columnHelper.accessor((row) => row.registration.registration_number, {
          id: "registration",
          header: ({ column }) => (
            <SortableHeader
              title="Registration"
              canSort={column.getCanSort()}
              isSorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
            />
          ),
          cell: ({ row }) => {
            const item = row.original;
            const submissionNumber = item.group.submission?.submission_number;
            return (
              <div className="flex min-w-40 max-w-52 flex-col gap-0.5">
                <span className="font-medium">
                  {item.registration.registration_number}
                </span>
                <span
                  className="truncate text-xs text-muted-foreground"
                  title={item.registration.project.title}
                >
                  {item.registration.project.title}
                </span>
                {submissionNumber ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {submissionNumber}
                  </span>
                ) : null}
              </div>
            );
          },
        }),
        columnHelper.accessor("institution", {
          id: "university",
          header: ({ column }) => (
            <SortableHeader
              title="University"
              canSort={column.getCanSort()}
              isSorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
            />
          ),
          cell: ({ row }) => (
            <span
              className="block max-w-48 truncate"
              title={row.original.institution}
            >
              {row.original.institution || "—"}
            </span>
          ),
          sortFn: (a, b) => {
            const byUniversity = a.original.institution.localeCompare(
              b.original.institution,
              undefined,
              { sensitivity: "base" }
            );
            if (byUniversity !== 0) return byUniversity;
            return a.original.registration.registration_number.localeCompare(
              b.original.registration.registration_number,
              undefined,
              { numeric: true }
            );
          },
        }),
        columnHelper.accessor((row) => row.registration.participant.name, {
          id: "participant",
          header: ({ column }) => (
            <SortableHeader
              title="Participant"
              canSort={column.getCanSort()}
              isSorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
            />
          ),
          cell: ({ row }) => (
            <div className="flex max-w-48 flex-col gap-0.5">
              <span
                className="truncate"
                title={row.original.registration.participant.name}
              >
                {row.original.registration.participant.name}
              </span>
              <span
                className="truncate text-xs text-muted-foreground"
                title={row.original.registration.participant.email}
              >
                {row.original.registration.participant.email}
              </span>
            </div>
          ),
        }),
        columnHelper.accessor("created_at", {
          id: "created",
          header: ({ column }) => (
            <SortableHeader
              title="Created"
              canSort={column.getCanSort()}
              isSorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
            />
          ),
          cell: ({ row }) => (
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {formatCreated(row.original.created_at || undefined)}
            </span>
          ),
          sortFn: (a, b) => {
            const left = a.original.created_at || "";
            const right = b.original.created_at || "";
            if (!left && !right) return 0;
            if (!left) return 1;
            if (!right) return -1;
            return left.localeCompare(right);
          },
        }),
        columnHelper.display({
          id: "fee",
          header: "Fee",
          enableSorting: false,
          cell: ({ row }) => {
            const item = row.original;
            const { group } = item;
            const currency =
              group.submission?.currency ?? item.payment?.currency ?? "MYR";
            const canEdit = Boolean(group.submission) && tab === "REVIEW";
            const amount =
              drafts[item.registration._id] ??
              String(item.payment?.amount ?? item.registration.fee ?? 0);
            const busy = busyId === group.id;
            const paymentStatus = item.payment?.status;
            const showStatus = paymentStatus && paymentStatus !== tab;
            const requestedAt = group.submission?.payment_requested_at;

            return (
              <div className="flex flex-col gap-1">
                {canEdit ? (
                  <div className="relative w-32">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      {currency === "MYR" ? "RM" : "USD"}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`Fee for ${item.registration.registration_number}`}
                      className={`h-8 tabular-nums ${currency === "MYR" ? "pl-9" : "pl-11"}`}
                      value={amount}
                      disabled={busy}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.registration._id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ) : (
                  <span className="font-medium tabular-nums">
                    {(item.payment?.amount ?? 0) === 0
                      ? "Free"
                      : formatMoney(item.payment?.amount ?? 0, currency)}
                  </span>
                )}
                {showStatus || requestedAt ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {showStatus ? (
                      <Badge variant={paymentStatusVariant(paymentStatus)}>
                        {PAYMENT_STATUS_LABELS[paymentStatus]}
                      </Badge>
                    ) : null}
                    {requestedAt ? (
                      <span>Requested {formatDay(requestedAt)}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          },
        }),
        columnHelper.display({
          id: "status",
          header: "Reg. status",
          enableSorting: false,
          cell: ({ row }) => {
            const item = row.original;
            const busy = busyId === item.group.id;
            return (
              <Select
                value={item.registration.status}
                onValueChange={(value) =>
                  void setRegistrationStatus(
                    item.group,
                    item.registration._id,
                    value as RegistrationStatus
                  )
                }
                disabled={busy}
              >
                <SelectTrigger
                  size="sm"
                  aria-label={`Registration status for ${item.registration.registration_number}`}
                  className="h-7 border-border bg-transparent pr-2 pl-2.5 text-xs font-medium hover:bg-muted"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  {REGISTRATION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <span className={`size-2 rounded-full ${status.dot}`} />
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          header: () => <div className="text-right">Actions</div>,
          enableSorting: false,
          cell: ({ row }) => {
            const item = row.original;
            const { group } = item;
            const busy = busyId === group.id;
            const canEdit = Boolean(group.submission) && tab === "REVIEW";
            const draftTotal = groupDraftTotal(group, drafts);
            const receiptUrl = group.projects.find(
              (project) => project.payment?.receipt_url
            )?.payment?.receipt_url;
            const menuLabel = `More actions for ${item.registration.registration_number}`;
            const openAdjustment = (type: AdjustmentType) =>
              setAdjustment({
                groupId: group.id,
                submissionNumber:
                  group.submission?.submission_number ?? "this submission",
                type,
                amount: "",
                currency: group.submission?.currency ?? "MYR",
              });

            return (
              <div className="flex items-center justify-end gap-1.5">
                {receiptUrl && tab !== "REVIEW" ? (
                  <Button size="icon-sm" variant="outline" asChild>
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="View receipt"
                      aria-label={`View receipt for ${item.registration.registration_number}`}
                    >
                      <IconReceipt />
                    </a>
                  </Button>
                ) : null}
                {canEdit ? (
                  <>
                    <Button
                      size="sm"
                      disabled={busy || draftTotal === null}
                      onClick={() => void sendPaymentRequest(group)}
                    >
                      <IconMail />
                      {draftTotal === 0 ? "Mark as no charge" : "Send request"}
                    </Button>
                    <RowActionsMenu label={menuLabel} disabled={busy}>
                      <DropdownMenuItem
                        onSelect={() => {
                          setBusyId(group.id);
                          void saveFees(group)
                            .then((saved) => {
                              if (saved) toast.success("Prices saved.");
                            })
                            .finally(() => setBusyId(null));
                        }}
                      >
                        <IconDeviceFloppy />
                        Save prices without sending
                      </DropdownMenuItem>
                    </RowActionsMenu>
                  </>
                ) : null}
                {tab === "AWAITING" && group.submission ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void submissionAction(
                          group,
                          "payment-reminder",
                          {},
                          "Payment reminder sent."
                        )
                      }
                    >
                      <IconBell />
                      Remind
                    </Button>
                    {group.submission.balance_due ? null : (
                      <RowActionsMenu label={menuLabel} disabled={busy}>
                        <DropdownMenuItem
                          onSelect={() => void resendPaymentRequest(group)}
                        >
                          <IconMail />
                          Resend payment request
                        </DropdownMenuItem>
                      </RowActionsMenu>
                    )}
                  </>
                ) : null}
                {tab === "PENDING" ? (
                  <>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => verify(group, "PAID")}
                    >
                      <IconCheck />
                      Mark paid
                    </Button>
                    <RowActionsMenu label={menuLabel} disabled={busy}>
                      <DropdownMenuItem
                        disabled={!group.submission}
                        onSelect={() => openAdjustment("UNDERPAID")}
                      >
                        <IconArrowDown />
                        Underpaid…
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!group.submission}
                        onSelect={() => openAdjustment("OVERPAID")}
                      >
                        <IconArrowUp />
                        Overpaid…
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => verify(group, "FAILED")}
                      >
                        <IconX />
                        Mark failed
                      </DropdownMenuItem>
                    </RowActionsMenu>
                  </>
                ) : null}
                {tab === "PAID" || tab === "FAILED" ? (
                  <RowActionsMenu label={menuLabel} disabled={busy}>
                    <DropdownMenuItem
                      onSelect={() =>
                        void setPaymentStatus(
                          group,
                          receiptUrl
                            ? "PENDING"
                            : group.submission?.payment_requested_at
                              ? "AWAITING"
                              : "REVIEW"
                        )
                      }
                    >
                      <IconArrowBackUp />
                      Reopen payment
                    </DropdownMenuItem>
                  </RowActionsMenu>
                ) : null}
              </div>
            );
          },
        }),
      ]),
    // Handlers close over latest drafts/busy/tab; recreate columns when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps for interactive cells
    [tab, drafts, busyId]
  );

  const table = useTable({
    features,
    data: filteredRows,
    columns,
    state: { sorting },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
  });

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold">Payment requests</h2>
        <p className="text-sm text-muted-foreground">
          Check the fee, then email every participant a link to pay by bank
          transfer and upload a receipt.
        </p>
      </div>

      <Tabs
        value={educationLevel}
        onValueChange={(value) => {
          setEducationLevel(value as EducationLevel);
          setTab("REVIEW");
          setQuery("");
        }}
        className="gap-4"
      >
        <TabsList>
          {EDUCATION_TABS.map((level) => {
            const count = allRows.filter(
              (row) => row.education_level === level
            ).length;
            return (
              <TabsTrigger key={level} value={level}>
                {EDUCATION_LEVEL_LABELS[level]} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {EDUCATION_TABS.map((level) => (
          <TabsContent key={level} value={level} className="mt-0">
            <Tabs
              value={tab}
              onValueChange={(value) => {
                setTab(value as PaymentTab);
                setQuery("");
              }}
              className="gap-4"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
                {(Object.keys(TAB_LABELS) as PaymentTab[]).map((key) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="h-8 whitespace-normal"
                  >
                    {TAB_LABELS[key]} ({paymentCounts[key]})
                  </TabsTrigger>
                ))}
              </TabsList>

              {(Object.keys(TAB_LABELS) as PaymentTab[]).map((key) => (
                <TabsContent key={key} value={key} className="mt-0">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="relative">
                      <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search registrations…"
                        className="h-8 w-56 pl-8 lg:w-72"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {filteredRows.length} registration
                      {filteredRows.length === 1 ? "" : "s"}
                    </p>
                  </div>

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
                              className="h-24 text-center text-muted-foreground"
                            >
                              No registrations in this group.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog
        open={adjustment !== null}
        onOpenChange={(open) => {
          if (!open) setAdjustment(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {adjustment?.type === "OVERPAID"
                ? "Mark as overpaid"
                : "Mark as underpaid"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {adjustment?.type === "OVERPAID"
                ? `Enter how much extra was transferred for ${adjustment.submissionNumber}. The submission is marked paid, and the participants are emailed an invoice plus a note that the difference will be refunded.`
                : `Enter the shortfall for ${adjustment?.submissionNumber ?? "this submission"}. The participants are emailed that amount and a link to pay the balance.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adjustment-amount">Amount</Label>
              <Input
                id="adjustment-amount"
                type="number"
                min={0.01}
                step="0.01"
                value={adjustment?.amount ?? ""}
                onChange={(event) =>
                  setAdjustment((current) =>
                    current
                      ? { ...current, amount: event.target.value }
                      : current
                  )
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Currency</Label>
              <Select
                value={adjustment?.currency ?? "MYR"}
                onValueChange={(value) =>
                  setAdjustment((current) =>
                    current
                      ? { ...current, currency: value as Currency }
                      : current
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency === "MYR" ? "RM" : "USD"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>Cancel</AlertDialogCancel>
            <Button
              disabled={busyId !== null}
              onClick={() => void confirmAdjustment()}
            >
              {busyId !== null ? "Sending…" : "Send notice"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
