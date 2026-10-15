import { NextRequest } from "next/server";

import { sendPaymentReminderEmail } from "@/lib/email";
import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import { submissionSettlementSchema } from "@/schemas/submissionSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSecretarySession } from "@/utils/portalAuth";
import {
  emailEach,
  ensurePaymentUrl,
  loadSubmissionPaymentGroup,
  submissionRecipients,
} from "@/utils/submissionPayments";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSecretarySession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const submissionModel = new SubmissionModel();
    const submission = await submissionModel.findById(id);
    if (!submission) {
      return createResponse({ error: "Submission not found" }, 404);
    }

    const payments = await new PaymentModel().find({ submission_id: id });
    if (
      payments.length === 0 ||
      !payments.every((payment) => payment.status === "AWAITING")
    ) {
      return createResponse(
        { error: "Reminders can only be sent while payment is awaited." },
        400
      );
    }

    const recipients = submissionRecipients(
      await new RegistrationModel().find({ submission_id: id })
    );
    if (recipients.length === 0) {
      return createResponse({ error: "This submission has no participant email." }, 400);
    }

    const isBalance = Boolean(submission.balance_due);
    const payUrl = await ensurePaymentUrl(submission);
    const delivery = await emailEach(recipients, (to) =>
      sendPaymentReminderEmail({
        to,
        submissionNumber: submission.submission_number,
        amount: submission.balance_due ?? submission.amount,
        currency: isBalance
          ? (submission.balance_currency ?? submission.currency ?? "MYR")
          : (submission.currency ?? "MYR"),
        payUrl,
        isBalance,
      })
    );

    if (delivery.sent === 0) {
      return createResponse({ error: "Failed to send the reminder email." }, 502);
    }

    await submissionModel.update(
      id,
      { payment_reminded_at: new Date() },
      submissionSettlementSchema
    );

    return createResponse({
      group: await loadSubmissionPaymentGroup(id),
      warning:
        delivery.failed > 0
          ? `Sent to ${delivery.sent} of ${delivery.total} participants.`
          : undefined,
    });
  } catch (error) {
    return handleError(error);
  }
}
