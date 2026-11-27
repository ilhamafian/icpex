import { NextRequest } from "next/server";

import {
  emailCopyFor,
  mailboxForLevels,
  sendNoPaymentDueEmail,
  sendPaymentRequestEmail,
} from "@/lib/email";
import { CompetitionModel } from "@/models/Competition";
import { RegistrationModel } from "@/models/Registration";
import { PaymentModel } from "@/models/Payment";
import { SubmissionModel } from "@/models/Submission";
import { toIdString } from "@/schemas/objectId";
import { submissionFeesSchema, submissionPaymentLinkSchema } from "@/schemas/submissionSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSecretarySession } from "@/utils/portalAuth";
import type { Currency } from "@/utils/registrationFee";
import {
  applySubmissionFees,
  deliveryWarning,
  emailEach,
  ensurePaymentUrl,
  loadSubmissionPaymentGroup,
  setSubmissionPaymentsStatus,
  submissionLetterDetails,
  submissionRecipients,
} from "@/utils/submissionPayments";
import { denyUnlessSubmission } from "@/utils/trackAccess";
import { sendAfterPaymentDocumentEmails } from "@/utils/documentUpload";

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
    const denied = await denyUnlessSubmission(session.role, id);
    if (denied) return denied;
    const body = await req.json().catch(() => ({}));
    const feesParsed = submissionFeesSchema
      .pick({ fees: true })
      .partial()
      .safeParse(body);
    if (!feesParsed.success) {
      return createResponse({ error: "Enter a valid fee for every project." }, 400);
    }

    if (feesParsed.data.fees) {
      const applied = await applySubmissionFees(id, feesParsed.data.fees);
      if ("error" in applied) {
        return createResponse({ error: applied.error }, 400);
      }
    }

    const submissionModel = new SubmissionModel();
    const submission = await submissionModel.findById(id);
    if (!submission) {
      return createResponse({ error: "Submission not found" }, 404);
    }

    const payments = await new PaymentModel().find({ submission_id: id });
    if (payments.length === 0) {
      return createResponse({ error: "This submission has no payment record." }, 400);
    }

    const registrations = await new RegistrationModel().find({
      submission_id: id,
    });
    const recipients = submissionRecipients(registrations);
    if (recipients.length === 0) {
      return createResponse({ error: "This submission has no participant email." }, 400);
    }
    const competition = await new CompetitionModel().findById(
      toIdString(submission.competition_id)
    );
    const copy = await emailCopyFor(competition);
    const details = submissionLetterDetails(registrations);
    const educationLevel = mailboxForLevels(
      registrations.map((registration) => registration.participant.education_level)
    );
    const letter = {
      ...details,
      institutionName: submission.institution.name,
      categoryLabel: [
        ...new Set(
          registrations.map((registration) =>
            registration.participant.education_level === "POSTGRADUATE"
              ? copy.postgraduateStreamName
              : copy.undergraduateStreamName
          )
        ),
      ].join(" / "),
    };

    const statuses = new Set(payments.map((payment) => payment.status));
    const currency = (submission.currency ?? "MYR") as Currency;

    if (submission.amount === 0) {
      if (![...statuses].every((status) => status === "REVIEW" || status === "PAID")) {
        return createResponse(
          { error: "Prices can no longer be changed for this submission." },
          400
        );
      }
      const becamePaid = !statuses.has("PAID") || statuses.size > 1;
      if (becamePaid) {
        await setSubmissionPaymentsStatus(id, "PAID");
      }
      const delivery = await emailEach(recipients, (to) =>
        sendNoPaymentDueEmail({
          to,
          submissionNumber: submission.submission_number,
          participantName: letter.participantName,
          educationLevel,
          copy,
        })
      );
      let warning = deliveryWarning(delivery);
      if (becamePaid) {
        try {
          const documents = await sendAfterPaymentDocumentEmails(id);
          if (documents.total > 0 && documents.sent === 0) {
            warning = [
              warning,
              "Marked as no charge, but the document upload email could not be sent.",
            ]
              .filter(Boolean)
              .join(" ");
          } else if (documents.failed > 0) {
            warning = [
              warning,
              `Document upload link sent to ${documents.sent} of ${documents.total} participants.`,
            ]
              .filter(Boolean)
              .join(" ");
          }
        } catch (documentError) {
          console.error("Document upload email failed:", documentError);
          warning = [
            warning,
            "Marked as no charge, but the document upload email could not be sent.",
          ]
            .filter(Boolean)
            .join(" ");
        }
      }
      const group = await loadSubmissionPaymentGroup(id);
      return createResponse({ group, warning });
    }

    const canRequest = [...statuses].every(
      (status) => status === "REVIEW" || status === "AWAITING"
    );
    if (!canRequest) {
      return createResponse(
        { error: "A payment request can only be sent before a receipt is uploaded." },
        400
      );
    }
    if (submission.balance_due) {
      return createResponse(
        { error: "Only a balance is outstanding. Send a payment reminder instead." },
        400
      );
    }

    const payUrl = await ensurePaymentUrl(submission);
    const amountByRegistration = new Map(
      payments.map((payment) => [
        toIdString(payment.registration_id),
        payment.amount,
      ])
    );
    const projects = registrations
      .slice()
      .sort((a, b) =>
        a.registration_number.localeCompare(b.registration_number, undefined, {
          numeric: true,
        })
      )
      .map((registration) => ({
        title: registration.project.title,
        amount: amountByRegistration.get(toIdString(registration._id)) ?? 0,
      }));

    const delivery = await emailEach(recipients, (to) =>
      sendPaymentRequestEmail({
        to,
        submissionNumber: submission.submission_number,
        amount: submission.amount,
        currency,
        payUrl,
        projects,
        letter,
        educationLevel,
        copy,
      })
    );

    if (delivery.sent === 0) {
      return createResponse(
        { error: "Failed to send the payment request email." },
        502
      );
    }

    await setSubmissionPaymentsStatus(id, "AWAITING");
    await submissionModel.update(
      id,
      { payment_requested_at: submission.payment_requested_at ?? new Date() },
      submissionPaymentLinkSchema
    );

    const group = await loadSubmissionPaymentGroup(id);
    if (delivery.failed > 0) {
      return createResponse({
        group,
        warning: `Sent to ${delivery.sent} of ${delivery.total} participants. Try resending for the rest.`,
      });
    }

    return createResponse({ group });
  } catch (error) {
    return handleError(error);
  }
}
