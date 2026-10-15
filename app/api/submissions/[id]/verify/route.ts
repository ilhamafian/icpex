import { NextRequest } from "next/server";

import {
  sendPaymentReceivedEmail,
  sendUnderpaidEmail,
} from "@/lib/email";
import { createInvoicePdf } from "@/lib/invoicePdf";
import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import { toIdString } from "@/schemas/objectId";
import {
  paymentVerificationSchema,
  submissionSettlementSchema,
  type PaymentAdjustment,
} from "@/schemas/submissionSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSecretarySession } from "@/utils/portalAuth";
import type { Currency } from "@/utils/registrationFee";
import {
  deliveryWarning,
  emailEach,
  ensurePaymentUrl,
  invoiceNumberFor,
  loadSubmissionPaymentGroup,
  setSubmissionPaymentsStatus,
  submissionRecipients,
} from "@/utils/submissionPayments";

/**
 * Secretary decision on an uploaded receipt: paid (with invoice), failed,
 * underpaid (back to awaiting with a balance), or overpaid (paid, refund noted).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSecretarySession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const parsed = paymentVerificationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        400
      );
    }
    const decision = parsed.data;

    const submissionModel = new SubmissionModel();
    const submission = await submissionModel.findById(id);
    if (!submission) {
      return createResponse({ error: "Submission not found" }, 404);
    }

    const payments = await new PaymentModel().find({ submission_id: id });
    if (payments.length === 0) {
      return createResponse({ error: "This submission has no payment record." }, 400);
    }
    if (!payments.every((payment) => payment.status === "PENDING")) {
      return createResponse(
        { error: "Only a submission with an uploaded receipt can be verified." },
        400
      );
    }

    if (decision.outcome === "FAILED") {
      await setSubmissionPaymentsStatus(id, "FAILED");
      return createResponse({ group: await loadSubmissionPaymentGroup(id) });
    }

    const registrations = await new RegistrationModel().find({
      submission_id: id,
    });
    const recipients = submissionRecipients(registrations);
    const currency = (submission.currency ?? "MYR") as Currency;
    const receiptUrl = payments.find((payment) => payment.receipt_url)?.receipt_url;
    const now = new Date();

    const adjustments: PaymentAdjustment[] = [
      ...(submission.payment_adjustments ?? []),
    ];
    if (decision.outcome === "UNDERPAID" || decision.outcome === "OVERPAID") {
      adjustments.push({
        type: decision.outcome,
        amount: decision.amount,
        currency: decision.currency,
        receipt_url: receiptUrl,
        created_at: now,
      });
    }

    if (decision.outcome === "UNDERPAID") {
      await submissionModel.update(
        id,
        {
          balance_due: decision.amount,
          balance_currency: decision.currency,
          payment_adjustments: adjustments,
        },
        submissionSettlementSchema
      );
      await setSubmissionPaymentsStatus(id, "AWAITING");

      const payUrl = await ensurePaymentUrl(submission);
      const delivery = await emailEach(recipients, (to) =>
        sendUnderpaidEmail({
          to,
          submissionNumber: submission.submission_number,
          balance: decision.amount,
          currency: decision.currency,
          payUrl,
        })
      );

      return createResponse({
        group: await loadSubmissionPaymentGroup(id),
        warning: deliveryWarning(delivery),
      });
    }

    const invoiceNumber = submission.invoice_number ?? invoiceNumberFor(submission.submission_number);
    await submissionModel.update(
      id,
      {
        balance_due: null,
        payment_adjustments: adjustments,
        paid_at: now,
        invoice_number: invoiceNumber,
      },
      submissionSettlementSchema
    );
    await setSubmissionPaymentsStatus(id, "PAID");

    const amountByRegistration = new Map(
      payments.map((payment) => [toIdString(payment.registration_id), payment.amount])
    );
    const overpaid =
      decision.outcome === "OVERPAID"
        ? { amount: decision.amount, currency: decision.currency }
        : undefined;

    let warning: string | undefined;
    try {
      const invoicePdf = await createInvoicePdf({
        invoiceNumber,
        submissionNumber: submission.submission_number,
        issuedAt: now,
        institution: submission.institution,
        participants: registrations.map(
          (registration) =>
            `${registration.participant.name} <${registration.participant.email}>`
        ),
        currency,
        items: registrations
          .slice()
          .sort((a, b) =>
            a.registration_number.localeCompare(b.registration_number, undefined, {
              numeric: true,
            })
          )
          .map((registration) => ({
            registrationNumber: registration.registration_number,
            title: registration.project.title,
            amount: amountByRegistration.get(toIdString(registration._id)) ?? 0,
          })),
        total: submission.amount,
        overpaid,
      });

      const delivery = await emailEach(recipients, (to) =>
        sendPaymentReceivedEmail({
          to,
          submissionNumber: submission.submission_number,
          invoiceNumber,
          amount: submission.amount,
          currency,
          invoicePdf,
          overpaid,
        })
      );
      warning = deliveryWarning(delivery);
    } catch (invoiceError) {
      console.error("Invoice generation failed:", invoiceError);
      warning = "Marked as paid, but the invoice email could not be created.";
    }

    return createResponse({
      group: await loadSubmissionPaymentGroup(id),
      warning,
    });
  } catch (error) {
    return handleError(error);
  }
}
