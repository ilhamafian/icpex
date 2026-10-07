"use client";

import { useMemo, useState } from "react";
import {
  IconExternalLink,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentStatus } from "@/schemas/paymentSchema";
import {
  FREE_PROJECT_EVERY,
  type Registration,
} from "@/schemas/registrationSchema";
import type { SerializedPayment } from "@/utils/serializePayment";
import type { SerializedRegistration } from "@/utils/serializeRegistration";

export type RegistrationPaymentRow = {
  registration: SerializedRegistration;
  payment: SerializedPayment | null;
};

type PaymentTab = "PENDING" | "PAID" | "FAILED" | "NONE";

type PaymentFormState = {
  registration_id: string;
  amount: string;
  receipt_url: string;
  status: PaymentStatus;
};

type RegistrationStatus = Registration["status"];

function emptyPaymentForm(
  registrationId = "",
  amount = ""
): PaymentFormState {
  return {
    registration_id: registrationId,
    amount,
    receipt_url: "",
    status: "PENDING",
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
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

function formatAmount(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function PaymentVerificationManager({
  initialRows,
}: {
  initialRows: RegistrationPaymentRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [tab, setTab] = useState<PaymentTab>("PENDING");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPaymentForm);
  const [deleteTarget, setDeleteTarget] = useState<SerializedPayment | null>(
    null
  );

  const byTab = useMemo(() => {
    const groups: Record<PaymentTab, RegistrationPaymentRow[]> = {
      PENDING: [],
      PAID: [],
      FAILED: [],
      NONE: [],
    };
    for (const row of rows) {
      if (!row.payment) {
        groups.NONE.push(row);
      } else {
        groups[row.payment.status].push(row);
      }
    }
    return groups;
  }, [rows]);

  const registrationsWithoutPayment = useMemo(
    () => rows.filter((row) => !row.payment).map((row) => row.registration),
    [rows]
  );

  const submissionSizes = useMemo(() => {
    const sizes = new Map<string, number>();
    for (const row of rows) {
      const id = row.registration.submission_id;
      if (id) sizes.set(id, (sizes.get(id) ?? 0) + 1);
    }
    return sizes;
  }, [rows]);

  /** Re-fetch rows whose payment changed, including submission siblings. */
  async function refreshRows(registrationIds: string[]) {
    const refreshed = await Promise.all(
      [...new Set(registrationIds)].map(refreshRegistration)
    );
    for (const row of refreshed) {
      if (row) upsertRow(row);
    }
  }

  async function changedRegistrationIds(
    res: Response,
    registrationId: string
  ): Promise<string[]> {
    try {
      const data = (await res.json()) as { siblings?: SerializedPayment[] };
      return [
        registrationId,
        ...(data.siblings ?? []).map((payment) => payment.registration_id),
      ];
    } catch {
      return [registrationId];
    }
  }

  function upsertRow(next: RegistrationPaymentRow) {
    setRows((prev) => {
      const index = prev.findIndex(
        (row) => row.registration._id === next.registration._id
      );
      if (index === -1) return [next, ...prev];
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
  }

  function openCreate(registrationId?: string) {
    setEditingPaymentId(null);
    setForm(emptyPaymentForm(registrationId ?? "", ""));
    setSheetOpen(true);
  }

  function openEdit(row: RegistrationPaymentRow) {
    if (!row.payment) return;
    setEditingPaymentId(row.payment._id);
    setForm({
      registration_id: row.registration._id,
      amount: String(row.payment.amount),
      receipt_url: row.payment.receipt_url,
      status: row.payment.status,
    });
    setSheetOpen(true);
  }

  async function refreshRegistration(registrationId: string) {
    const res = await fetch(`/api/registrations/${registrationId}`);
    if (!res.ok) return null;
    return (await res.json()) as RegistrationPaymentRow;
  }

  async function handleSavePayment() {
    const amount = Number(form.amount);
    if (!form.registration_id) {
      toast.error("Select a registration.");
      return;
    }
    const minAmount = editingPaymentId ? 0 : 0.01;
    if (!Number.isFinite(amount) || amount < minAmount) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (amount > 0 && !form.receipt_url.trim()) {
      toast.error("Receipt URL is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editingPaymentId
          ? `/api/payments/${editingPaymentId}`
          : "/api/payments",
        {
          method: editingPaymentId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingPaymentId
              ? {
                  amount,
                  receipt_url: form.receipt_url.trim() || undefined,
                  status: form.status,
                }
              : {
                  registration_id: form.registration_id,
                  amount,
                  receipt_url: form.receipt_url.trim(),
                  status: form.status,
                }
          ),
        }
      );

      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }

      await refreshRows(
        await changedRegistrationIds(res, form.registration_id)
      );

      setSheetOpen(false);
      toast.success(
        editingPaymentId ? "Payment updated." : "Payment recorded."
      );
    } catch {
      toast.error("Failed to save payment.");
    } finally {
      setSaving(false);
    }
  }

  async function setPaymentStatus(
    row: RegistrationPaymentRow,
    status: PaymentStatus
  ) {
    if (!row.payment) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/payments/${row.payment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const changed = await changedRegistrationIds(res, row.registration._id);
      await refreshRows(changed);
      const others = changed.length - 1;
      if (others > 0) {
        toast.info(
          `Also applied to ${others} other project${others === 1 ? "" : "s"} in ${
            row.registration.submission_number ?? "this submission"
          } (same receipt).`
        );
      }
      toast.success(
        status === "PAID"
          ? "Payment verified as paid."
          : status === "FAILED"
            ? "Payment marked as failed."
            : "Payment set back to pending."
      );
    } catch {
      toast.error("Failed to update payment status.");
    } finally {
      setSaving(false);
    }
  }

  async function setRegistrationStatus(
    row: RegistrationPaymentRow,
    status: RegistrationStatus
  ) {
    setSaving(true);
    try {
      const res = await fetch(`/api/registrations/${row.registration._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const data = (await res.json()) as RegistrationPaymentRow;
      upsertRow(data);
      toast.success("Registration status updated.");
    } catch {
      toast.error("Failed to update registration.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/payments/${target._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const refreshed = await refreshRegistration(target.registration_id);
      if (refreshed) {
        upsertRow(refreshed);
      } else {
        setRows((prev) =>
          prev.map((row) =>
            row.payment?._id === target._id
              ? { ...row, payment: null }
              : row
          )
        );
      }
      toast.success("Payment removed.");
    } catch {
      toast.error("Failed to delete payment.");
    }
  }

  const tabLabels: Record<PaymentTab, string> = {
    PENDING: "Pending",
    PAID: "Paid",
    FAILED: "Failed",
    NONE: "No payment",
  };

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Payment verification</h2>
          <p className="text-sm text-muted-foreground">
            Check receipts and mark registration payments as paid or failed.
          </p>
        </div>
        <Button
          size="icon"
          onClick={() => openCreate()}
          aria-label="Add payment"
          disabled={registrationsWithoutPayment.length === 0}
        >
          <IconPlus />
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as PaymentTab)}
        className="gap-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          {(Object.keys(tabLabels) as PaymentTab[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {tabLabels[key]} ({byTab[key].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(tabLabels) as PaymentTab[]).map((key) => {
          const items = byTab[key];
          return (
            <TabsContent key={key} value={key} className="mt-0">
              {items.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No registrations in this group.
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {items.map((row) => (
                    <Card key={row.registration._id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-base">
                              {row.registration.registration_number}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {row.registration.project.title} ·{" "}
                              {row.registration.participant.name}
                            </CardDescription>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {row.registration.participant.email} ·{" "}
                              {row.registration.participant.institution.name}
                            </p>
                            {row.registration.submission_id ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                Submission{" "}
                                <span className="font-medium text-foreground">
                                  {row.registration.submission_number ?? "—"}
                                </span>
                                {(submissionSizes.get(
                                  row.registration.submission_id
                                ) ?? 1) > 1
                                  ? ` · 1 of ${submissionSizes.get(
                                      row.registration.submission_id
                                    )} projects sharing one receipt`
                                  : ""}
                              </p>
                            ) : null}
                            {row.payment ? (
                              <p className="mt-2 text-sm">
                                {row.payment.amount === 0
                                  ? "No charge"
                                  : formatAmount(row.payment.amount)}
                                {row.payment.created_at
                                  ? ` · submitted ${new Date(
                                      row.payment.created_at
                                    ).toLocaleDateString()}`
                                  : ""}
                              </p>
                            ) : (
                              <p className="mt-2 text-sm text-muted-foreground">
                                No payment recorded yet
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <Badge
                              variant={registrationStatusVariant(
                                row.registration.status
                              )}
                            >
                              {row.registration.status}
                            </Badge>
                            {row.payment ? (
                              <Badge
                                variant={paymentStatusVariant(
                                  row.payment.status
                                )}
                              >
                                {row.payment.status}
                              </Badge>
                            ) : null}
                            {row.payment?.amount === 0 ? (
                              <Badge variant="secondary">
                                Free ({FREE_PROJECT_EVERY}th project)
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2 pt-0">
                        {row.payment ? (
                          <>
                            {row.payment.receipt_url ? (
                              <Button size="sm" variant="outline" asChild>
                                <a
                                  href={row.payment.receipt_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <IconExternalLink />
                                  Receipt
                                </a>
                              </Button>
                            ) : null}
                            {row.payment.status === "PENDING" ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={saving}
                                  onClick={() =>
                                    void setPaymentStatus(row, "PAID")
                                  }
                                >
                                  Mark paid
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={saving}
                                  onClick={() =>
                                    void setPaymentStatus(row, "FAILED")
                                  }
                                >
                                  Mark failed
                                </Button>
                              </>
                            ) : null}
                            {row.payment.status !== "PENDING" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() =>
                                  void setPaymentStatus(row, "PENDING")
                                }
                              >
                                Reopen
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(row)}
                              aria-label={`Edit payment for ${row.registration.registration_number}`}
                            >
                              <IconPencil />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(row.payment)}
                              aria-label={`Delete payment for ${row.registration.registration_number}`}
                            >
                              <IconTrash />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => openCreate(row.registration._id)}
                          >
                            <IconPlus />
                            Add payment
                          </Button>
                        )}

                        <Select
                          value={row.registration.status}
                          onValueChange={(value) =>
                            void setRegistrationStatus(
                              row,
                              value as RegistrationStatus
                            )
                          }
                          disabled={saving}
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col gap-4 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingPaymentId ? "Edit payment" : "Add payment"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 px-4">
            <Field label="Registration">
              <Select
                value={form.registration_id || undefined}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    registration_id: value,
                  }))
                }
                disabled={Boolean(editingPaymentId)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select registration" />
                </SelectTrigger>
                <SelectContent>
                  {(editingPaymentId
                    ? rows.map((row) => row.registration)
                    : registrationsWithoutPayment
                  ).map((registration) => (
                    <SelectItem key={registration._id} value={registration._id}>
                      {registration.registration_number} —{" "}
                      {registration.participant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Amount (MYR)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Receipt URL">
              <Input
                type="url"
                value={form.receipt_url}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    receipt_url: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Payment status">
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as PaymentStatus,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="PAID">PAID</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSavePayment()} disabled={saving}>
              {saving
                ? "Saving…"
                : editingPaymentId
                  ? "Save changes"
                  : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the payment record. The registration itself is kept.
              The participant may need to submit a new receipt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
