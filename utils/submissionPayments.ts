import "server-only";

import { WithId } from "mongodb";
import { z } from "zod";

import { getAppOrigin } from "@/lib/appOrigin";
import { createPaymentToken } from "@/lib/paymentToken";
import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import { toIdString } from "@/schemas/objectId";
import { paymentUpdateSchema, type PaymentStatus } from "@/schemas/paymentSchema";
import {
  registrationStatusUpdateSchema,
  type Registration,
} from "@/schemas/registrationSchema";
import {
  submissionAmountSchema,
  submissionFeesSchema,
  submissionPaymentLinkSchema,
  type Submission,
} from "@/schemas/submissionSchema";
import type { Currency } from "@/utils/registrationFee";
import { serializePayment, type SerializedPayment } from "@/utils/serializePayment";
import {
  serializeRegistration,
  type SerializedRegistration,
} from "@/utils/serializeRegistration";

export type SubmissionPaymentGroup = {
  /** Submission id, or `registration:<id>` for a registration with no submission. */
  id: string;
  submission: {
    _id: string;
    submission_number: string;
    institution_name: string;
    institution_country: string;
    amount: number;
    currency: Currency;
    payment_requested_at?: string;
    payment_reminded_at?: string;
    /** Outstanding after an underpaid receipt. */
    balance_due: number | null;
    balance_currency: Currency;
    adjustments: {
      type: "UNDERPAID" | "OVERPAID";
      amount: number;
      currency: Currency;
      created_at: string;
    }[];
    paid_at?: string;
    invoice_number?: string;
  } | null;
  projects: {
    registration: SerializedRegistration;
    payment: SerializedPayment | null;
  }[];
};

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

const registrationFeeSchema = z.object({
  fee: z.number().nonnegative(),
});

export async function advanceRegistrationIfPaid(
  registrationId: string,
  paymentStatus: string
) {
  if (paymentStatus !== "PAID") return;

  const model = new RegistrationModel();
  const registration = await model.findById(registrationId);
  if (!registration || registration.status !== "SUBMITTED") return;

  await model.update(
    registrationId,
    { status: "REVIEWING" },
    registrationStatusUpdateSchema
  );
}

export async function loadSubmissionPaymentGroups(): Promise<
  SubmissionPaymentGroup[]
> {
  const [registrations, payments, submissions] = await Promise.all([
    new RegistrationModel().find({}, { sort: { created_at: -1 } }),
    new PaymentModel().find({}, { sort: { created_at: -1 } }),
    new SubmissionModel().find({}),
  ]);

  const paymentByRegistrationId = new Map(
    payments.map((payment) => [toIdString(payment.registration_id), payment])
  );
  const submissionById = new Map(
    submissions.map((submission) => [toIdString(submission._id), submission])
  );

  const groups = new Map<string, SubmissionPaymentGroup>();

  for (const registration of registrations) {
    const registrationId = toIdString(registration._id);
    const submissionId = toIdString(registration.submission_id);
    const submission = submissionId
      ? submissionById.get(submissionId)
      : undefined;
    const key = submission ? submissionId : `registration:${registrationId}`;
    const payment = paymentByRegistrationId.get(registrationId) ?? null;

    let group = groups.get(key);
    if (!group) {
      group = {
        id: key,
        submission: submission ? serializeSubmission(submission) : null,
        projects: [],
      };
      groups.set(key, group);
    }

    group.projects.push({
      registration: serializeRegistration(
        registration,
        submission
          ? new Map([[submissionId, submission.submission_number]])
          : new Map()
      ),
      payment: payment ? serializePayment(payment) : null,
    });
  }

  for (const group of groups.values()) {
    group.projects.sort((a, b) =>
      a.registration.registration_number.localeCompare(
        b.registration.registration_number,
        undefined,
        { numeric: true }
      )
    );
  }

  const newest = (group: SubmissionPaymentGroup) =>
    group.projects.reduce((max, project) => {
      const created = project.registration.created_at ?? "";
      return created > max ? created : max;
    }, "");

  return [...groups.values()].sort((a, b) => newest(b).localeCompare(newest(a)));
}

export async function loadSubmissionPaymentGroup(
  submissionId: string
): Promise<SubmissionPaymentGroup | null> {
  const groups = await loadSubmissionPaymentGroups();
  return groups.find((group) => group.submission?._id === submissionId) ?? null;
}

function serializeSubmission(
  submission: WithId<Submission>
): NonNullable<SubmissionPaymentGroup["submission"]> {
  const currency = (submission.currency ?? "MYR") as Currency;
  return {
    _id: toIdString(submission._id),
    submission_number: submission.submission_number,
    institution_name: submission.institution.name,
    institution_country: submission.institution.country,
    amount: submission.amount,
    currency,
    payment_requested_at: toIso(submission.payment_requested_at),
    payment_reminded_at: toIso(submission.payment_reminded_at),
    balance_due: submission.balance_due ?? null,
    balance_currency: submission.balance_currency ?? currency,
    adjustments: (submission.payment_adjustments ?? []).map((adjustment) => ({
      type: adjustment.type,
      amount: adjustment.amount,
      currency: adjustment.currency,
      created_at: toIso(adjustment.created_at) ?? "",
    })),
    paid_at: toIso(submission.paid_at),
    invoice_number: submission.invoice_number,
  };
}

/** Every unique participant email on the submission, lowercased. */
export function submissionRecipients(registrations: WithId<Registration>[]) {
  return [
    ...new Set(
      registrations.map((registration) =>
        registration.participant.email.trim().toLowerCase()
      )
    ),
  ].filter(Boolean);
}

/** Create the reusable payment link on first use and return its absolute URL. */
export async function ensurePaymentUrl(submission: WithId<Submission>) {
  let token = submission.payment_token;
  if (!token || !submission.payment_token_hash) {
    const created = createPaymentToken();
    token = created.token;
    await new SubmissionModel().update(
      toIdString(submission._id),
      { payment_token: created.token, payment_token_hash: created.tokenHash },
      submissionPaymentLinkSchema
    );
  }
  const origin = await getAppOrigin();
  return `${origin}/pay/${encodeURIComponent(token)}`;
}

export async function emailEach(
  recipients: string[],
  send: (to: string) => Promise<void>
) {
  const results = await Promise.allSettled(recipients.map((to) => send(to)));
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Payment email failed:", result.reason);
    }
  }
  const failed = results.filter((result) => result.status === "rejected").length;
  return { sent: recipients.length - failed, failed, total: recipients.length };
}

export function deliveryWarning(delivery: { sent: number; total: number; failed: number }) {
  if (delivery.failed === 0) return undefined;
  return delivery.sent === 0
    ? "The email could not be sent. Check the mail settings and try again."
    : `Sent to ${delivery.sent} of ${delivery.total} participants.`;
}

export function invoiceNumberFor(submissionNumber: string) {
  return `INV-${submissionNumber.replace(/^SUB-/, "")}`;
}

export async function applySubmissionFees(
  submissionId: string,
  fees: z.infer<typeof submissionFeesSchema>["fees"]
): Promise<{ error: string } | { ok: true }> {
  const parsed = submissionFeesSchema.safeParse({ fees });
  if (!parsed.success) {
    return { error: "Enter a valid fee for every project." };
  }

  const submission = await new SubmissionModel().findById(submissionId);
  if (!submission) return { error: "Submission not found." };

  const registrations = await new RegistrationModel().find({
    submission_id: submissionId,
  });
  const registrationIds = new Set(
    registrations.map((registration) => toIdString(registration._id))
  );
  const feeIds = parsed.data.fees.map((fee) => toIdString(fee.registration_id));
  if (
    feeIds.length !== registrationIds.size ||
    feeIds.some((id) => !registrationIds.has(id)) ||
    new Set(feeIds).size !== feeIds.length
  ) {
    return { error: "Include a fee for every project in this submission." };
  }

  const payments = await new PaymentModel().find({
    submission_id: submissionId,
  });
  if (payments.length === 0) {
    return { error: "This submission has no payment record." };
  }
  if (payments.some((payment) => payment.status !== "REVIEW")) {
    return { error: "Prices can only be changed before the payment request is sent." };
  }

  const paymentByRegistration = new Map(
    payments.map((payment) => [toIdString(payment.registration_id), payment])
  );
  for (const id of feeIds) {
    if (!paymentByRegistration.has(id)) {
      return { error: "A project is missing its payment record." };
    }
  }

  const paymentModel = new PaymentModel();
  const registrationModel = new RegistrationModel();
  for (const fee of parsed.data.fees) {
    const registrationId = toIdString(fee.registration_id);
    const payment = paymentByRegistration.get(registrationId);
    if (!payment) continue;
    await paymentModel.update(
      toIdString(payment._id),
      { amount: fee.amount },
      paymentUpdateSchema
    );
    await registrationModel.update(
      registrationId,
      { fee: fee.amount },
      registrationFeeSchema
    );
  }

  const amount = parsed.data.fees.reduce((sum, fee) => sum + fee.amount, 0);
  await new SubmissionModel().update(
    submissionId,
    {
      amount,
      free_count: parsed.data.fees.filter((fee) => fee.amount === 0).length,
    },
    submissionAmountSchema
  );

  return { ok: true };
}

export async function setSubmissionPaymentsStatus(
  submissionId: string,
  status: PaymentStatus,
  extra: { receipt_url?: string } = {}
) {
  const payments = await new PaymentModel().find({
    submission_id: submissionId,
  });
  const model = new PaymentModel();
  for (const payment of payments) {
    await model.update(
      toIdString(payment._id),
      { status, ...extra },
      paymentUpdateSchema
    );
    await advanceRegistrationIfPaid(toIdString(payment.registration_id), status);
  }
}
