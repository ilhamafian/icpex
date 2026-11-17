import { NextRequest } from "next/server";

import {
  competitionEmailCopy,
  sendPaymentReminderEmail,
} from "@/lib/email";
import { CompetitionModel } from "@/models/Competition";
import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import { toIdString } from "@/schemas/objectId";
import { submissionSettlementSchema } from "@/schemas/submissionSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSecretarySession } from "@/utils/portalAuth";
import {
  emailEach,
  ensurePaymentUrl,
  loadSubmissionPaymentGroup,
  submissionLetterDetails,
  submissionRecipients,
} from "@/utils/submissionPayments";
import { denyUnlessSubmission } from "@/utils/trackAccess";

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
    const denied = await denyUnlessSubmission(session.role, id);
    if (denied) return denied;
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

    const registrations = await new RegistrationModel().find({ submission_id: id });
    const recipients = submissionRecipients(registrations);
    const letter = {
      ...submissionLetterDetails(registrations),
      institutionName: submission.institution.name,
    };
    if (recipients.length === 0) {
      return createResponse({ error: "This submission has no participant email." }, 400);
    }

    const competition = await new CompetitionModel().findById(
      toIdString(submission.competition_id)
    );
    const copy = competitionEmailCopy(competition ?? { name: "ICPEX" });
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
        letter,
        copy,
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
