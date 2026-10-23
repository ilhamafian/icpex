"use client";

import { useMemo, useState } from "react";
import {
  IconArrowsSort,
  IconExternalLink,
  IconMail,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
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

function registrationStatusVariant(
  status: RegistrationStatus
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
          cell: ({ row }) => (
            <span className="tabular-nums text-muted-foreground">
              {row.index + 1}
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
              <div className="flex min-w-40 max-w-56 flex-col gap-0.5">
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
          header: "Fee / Payment",
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

            return (
              <div className="flex min-w-36 flex-col gap-1.5">
                {canEdit ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">
                      {currency === "MYR" ? "RM" : "USD"}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`Fee for ${item.registration.registration_number}`}
                      className="h-8 w-28"
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
                  <span className="text-sm tabular-nums">
                    {(item.payment?.amount ?? 0) === 0
                      ? "Free"
                      : formatMoney(item.payment?.amount ?? 0, currency)}
                  </span>
                )}
                {paymentStatus ? (
                  <Badge
                    variant={paymentStatusVariant(paymentStatus)}
                    className="w-fit"
                  >
                    {PAYMENT_STATUS_LABELS[paymentStatus]}
                  </Badge>
                ) : null}
                {group.submission?.payment_requested_at ? (
                  <span className="text-xs text-muted-foreground">
                    Requested {formatDay(group.submission.payment_requested_at)}
                  </span>
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
              <div className="flex flex-col gap-1.5">
                <Badge
                  variant={registrationStatusVariant(item.registration.status)}
                  className="w-fit"
                >
                  {item.registration.status}
                </Badge>
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
                  <SelectTrigger className="h-8 w-35">
                    <SelectValue placeholder="Reg. status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUBMITTED">SUBMITTED</SelectItem>
                    <SelectItem value="REVIEWING">REVIEWING</SelectItem>
                    <SelectItem value="ACCEPTED">ACCEPTED</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                    <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          header: "Actions",
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

            return (
              <div className="flex max-w-72 flex-wrap gap-1.5">
                {canEdit ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setBusyId(group.id);
                        void saveFees(group)
                          .then((saved) => {
                            if (saved) toast.success("Prices saved.");
                          })
                          .finally(() => setBusyId(null));
                      }}
                    >
                      Save prices
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy || draftTotal === null}
                      onClick={() => void sendPaymentRequest(group)}
                    >
                      <IconMail />
                      {draftTotal === 0
                        ? "Mark as no charge"
                        : "Send payment request"}
                    </Button>
                  </>
                ) : null}
                {tab === "AWAITING" && group.submission ? (
                  <>
                    {receiptUrl ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={receiptUrl} target="_blank" rel="noreferrer">
                          <IconExternalLink />
                          Receipt
                        </a>
                      </Button>
                    ) : null}
                    {group.submission.balance_due ? null : (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void resendPaymentRequest(group)}
                      >
                        <IconMail />
                        Resend
                      </Button>
                    )}
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
                      <IconMail />
                      Remind
                    </Button>
                  </>
                ) : null}
                {tab === "PENDING" ? (
                  <>
                    {receiptUrl ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={receiptUrl} target="_blank" rel="noreferrer">
                          <IconExternalLink />
                          Receipt
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => verify(group, "PAID")}
                    >
                      Mark paid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !group.submission}
                      onClick={() =>
                        setAdjustment({
                          groupId: group.id,
                          submissionNumber:
                            group.submission?.submission_number ??
                            "this submission",
                          type: "UNDERPAID",
                          amount: "",
                          currency: group.submission?.currency ?? "MYR",
                        })
                      }
                    >
                      Underpaid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !group.submission}
                      onClick={() =>
                        setAdjustment({
                          groupId: group.id,
                          submissionNumber:
                            group.submission?.submission_number ??
                            "this submission",
                          type: "OVERPAID",
                          amount: "",
                          currency: group.submission?.currency ?? "MYR",
                        })
                      }
                    >
                      Overpaid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => verify(group, "FAILED")}
                    >
                      Mark failed
                    </Button>
                  </>
                ) : null}
                {tab === "PAID" || tab === "FAILED" ? (
                  <>
                    {receiptUrl ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={receiptUrl} target="_blank" rel="noreferrer">
                          <IconExternalLink />
                          Receipt
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
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
                      Reopen
                    </Button>
                  </>
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
