"use client";

import { useMemo, useState } from "react";
import { IconExternalLink, IconMail } from "@tabler/icons-react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const TAB_LABELS: Record<PaymentTab, string> = {
  REVIEW: "To review",
  AWAITING: "Awaiting payment",
  PENDING: "To verify",
  PAID: "Paid",
  FAILED: "Failed",
};

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

function formatDay(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function recipientEmails(group: SubmissionPaymentGroup) {
  return [
    ...new Set(
      group.projects.map((project) =>
        project.registration.participant.email.trim().toLowerCase()
      )
    ),
  ];
}

export function PaymentVerificationManager({
  initialGroups = [],
}: {
  initialGroups?: SubmissionPaymentGroup[];
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [tab, setTab] = useState<PaymentTab>("REVIEW");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState<AdjustmentDraft | null>(null);

  const byTab = useMemo(() => {
    const buckets: Record<PaymentTab, SubmissionPaymentGroup[]> = {
      REVIEW: [],
      AWAITING: [],
      PENDING: [],
      PAID: [],
      FAILED: [],
    };
    for (const group of groups) buckets[groupTab(group)].push(group);
    return buckets;
  }, [groups]);

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
          typeof data?.error === "string" ? data.error : "Failed to send the payment request."
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
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
      );
      const data = (await res.json().catch(() => null)) as {
        error?: unknown;
        warning?: string;
        group?: SubmissionPaymentGroup;
      } | null;
      if (!res.ok) {
        toast.error(
          typeof data?.error === "string" ? data.error : "Failed to resend the payment request."
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
        value={tab}
        onValueChange={(value) => setTab(value as PaymentTab)}
        className="gap-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
          {(Object.keys(TAB_LABELS) as PaymentTab[]).map((key) => (
            <TabsTrigger key={key} value={key} className="h-8 whitespace-normal">
              {TAB_LABELS[key]} ({byTab[key].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(TAB_LABELS) as PaymentTab[]).map((key) => (
          <TabsContent key={key} value={key} className="mt-0">
            {byTab[key].length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No submissions in this group.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {byTab[key].map((group) => (
                  <SubmissionCard
                    key={group.id}
                    group={group}
                    drafts={drafts}
                    busy={busyId === group.id}
                    onDraft={(registrationId, value) =>
                      setDrafts((current) => ({
                        ...current,
                        [registrationId]: value,
                      }))
                    }
                    onSave={() => {
                      setBusyId(group.id);
                      void saveFees(group)
                        .then((saved) => {
                          if (saved) toast.success("Prices saved.");
                        })
                        .finally(() => setBusyId(null));
                    }}
                    onSend={() => void sendPaymentRequest(group)}
                    onResend={() => void resendPaymentRequest(group)}
                    onRemind={() =>
                      void submissionAction(
                        group,
                        "payment-reminder",
                        {},
                        "Payment reminder sent."
                      )
                    }
                    onVerify={(outcome) => verify(group, outcome)}
                    onAdjust={(type) =>
                      setAdjustment({
                        groupId: group.id,
                        submissionNumber:
                          group.submission?.submission_number ?? "this submission",
                        type,
                        amount: "",
                        currency: group.submission?.currency ?? "MYR",
                      })
                    }
                    onPaymentStatus={(status) => void setPaymentStatus(group, status)}
                    onRegistrationStatus={(registrationId, status) =>
                      void setRegistrationStatus(group, registrationId, status)
                    }
                  />
                ))}
              </div>
            )}
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
              {adjustment?.type === "OVERPAID" ? "Mark as overpaid" : "Mark as underpaid"}
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
                    current ? { ...current, amount: event.target.value } : current
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

function SubmissionCard({
  group,
  drafts,
  busy,
  onDraft,
  onSave,
  onSend,
  onResend,
  onRemind,
  onVerify,
  onAdjust,
  onPaymentStatus,
  onRegistrationStatus,
}: {
  group: SubmissionPaymentGroup;
  drafts: Record<string, string>;
  busy: boolean;
  onDraft: (registrationId: string, value: string) => void;
  onSave: () => void;
  onSend: () => void;
  onResend: () => void;
  onRemind: () => void;
  onVerify: (outcome: "PAID" | "FAILED") => void;
  onAdjust: (type: AdjustmentType) => void;
  onPaymentStatus: (status: PaymentStatus) => void;
  onRegistrationStatus: (registrationId: string, status: RegistrationStatus) => void;
}) {
  const tab = groupTab(group);
  const currency =
    group.submission?.currency ?? group.projects[0]?.payment?.currency ?? "MYR";
  const canEdit = Boolean(group.submission) && tab === "REVIEW";
  const amounts = group.projects.map((project) => projectAmount(project, drafts));
  const draftTotal = amounts.reduce<number | null>((sum, amount) => {
    if (sum === null || amount === null) return null;
    return sum + amount;
  }, 0);
  const total =
    canEdit && draftTotal !== null
      ? draftTotal
      : (group.submission?.amount ??
        group.projects.reduce(
          (sum, project) => sum + (project.payment?.amount ?? 0),
          0
        ));
  const receiptUrl = group.projects.find((project) => project.payment?.receipt_url)
    ?.payment?.receipt_url;
  const title =
    group.submission?.submission_number ??
    group.projects[0]?.registration.registration_number ??
    "Registration";
  const institution =
    group.submission?.institution_name ??
    group.projects[0]?.registration.participant.institution.name ??
    "";
  const status = group.projects.find((project) => project.payment)?.payment?.status;
  const emails = recipientEmails(group);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">
              {institution}
              {group.submission?.institution_country
                ? ` · ${group.submission.institution_country}`
                : ""}
            </CardDescription>
            <p className="mt-2 text-sm">
              {total === 0 ? "No charge" : formatMoney(total, currency)}
              {group.submission?.balance_due
                ? ` · balance due ${formatMoney(
                    group.submission.balance_due,
                    group.submission.balance_currency
                  )}`
                : ""}
              {group.submission?.payment_requested_at
                ? ` · request sent ${formatDay(group.submission.payment_requested_at)}`
                : ""}
              {group.submission?.payment_reminded_at
                ? ` · reminded ${formatDay(group.submission.payment_reminded_at)}`
                : ""}
            </p>
            {group.submission?.adjustments
              .filter((adjustment) => adjustment.type === "OVERPAID")
              .slice(-1)
              .map((adjustment) => (
                <p key={adjustment.created_at} className="mt-1 text-sm text-muted-foreground">
                  Overpaid by {formatMoney(adjustment.amount, adjustment.currency)} — refund
                  noted on the invoice.
                </p>
              ))}
            {emails.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {(group.submission?.payment_requested_at
                  ? "Emailed to: "
                  : "Participants: ") + emails.join(", ")}
              </p>
            ) : null}
          </div>
          {status ? (
            <Badge variant={paymentStatusVariant(status)} className="shrink-0">
              {PAYMENT_STATUS_LABELS[status]}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <ul className="flex flex-col gap-3">
          {group.projects.map((project) => {
            const amount =
              drafts[project.registration._id] ??
              String(project.payment?.amount ?? project.registration.fee ?? 0);
            return (
              <li
                key={project.registration._id}
                className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {project.registration.registration_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {project.registration.project.title} ·{" "}
                    {project.registration.participant.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {project.registration.participant.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canEdit ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-foreground">
                        {currency === "MYR" ? "RM" : "USD"}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label={`Fee for ${project.registration.registration_number} in ${currency}`}
                        className="h-8 w-28"
                        value={amount}
                        disabled={busy}
                        onChange={(event) =>
                          onDraft(project.registration._id, event.target.value)
                        }
                      />
                    </div>
                  ) : (
                    <span className="text-sm tabular-nums">
                      {(project.payment?.amount ?? 0) === 0
                        ? "Free"
                        : formatMoney(project.payment?.amount ?? 0, currency)}
                    </span>
                  )}
                  <Badge
                    variant={registrationStatusVariant(project.registration.status)}
                  >
                    {project.registration.status}
                  </Badge>
                  <Select
                    value={project.registration.status}
                    onValueChange={(value) =>
                      onRegistrationStatus(
                        project.registration._id,
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
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={onSave}>
                Save prices
              </Button>
              <Button size="sm" disabled={busy || draftTotal === null} onClick={onSend}>
                <IconMail />
                {draftTotal === 0 ? "Mark as no charge" : "Send payment request"}
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
                <Button size="sm" disabled={busy} onClick={onResend}>
                  <IconMail />
                  Resend payment request
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={busy} onClick={onRemind}>
                <IconMail />
                Remind payment
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
              <Button size="sm" disabled={busy} onClick={() => onVerify("PAID")}>
                Mark paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !group.submission}
                onClick={() => onAdjust("UNDERPAID")}
              >
                Underpaid
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !group.submission}
                onClick={() => onAdjust("OVERPAID")}
              >
                Overpaid
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onVerify("FAILED")}
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
                  onPaymentStatus(
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
      </CardContent>
    </Card>
  );
}
