import { NextRequest } from "next/server";

import { PaymentModel } from "@/models/Payment";
import { createResponse, handleError } from "@/utils/apiHelper";
import { sendAfterPaymentDocumentEmails } from "@/utils/documentUpload";
import { requireSecretarySession } from "@/utils/portalAuth";
import { loadSubmissionPaymentGroup } from "@/utils/submissionPayments";
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

    const payments = await new PaymentModel().find({ submission_id: id });
    if (
      payments.length === 0 ||
      !payments.every((payment) => payment.status === "PAID")
    ) {
      return createResponse(
        { error: "Document reminders can only be sent after payment is confirmed." },
        400
      );
    }

    const delivery = await sendAfterPaymentDocumentEmails(id);
    if (delivery.total === 0) {
      return createResponse(
        { error: "There are no documents left to upload." },
        400
      );
    }
    if (delivery.sent === 0) {
      return createResponse(
        { error: "Failed to send the document reminder." },
        502
      );
    }

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
