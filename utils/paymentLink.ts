import "server-only";

import { readBankDetails, type BankDetails } from "@/lib/bankDetails";
import { hashPaymentToken } from "@/lib/paymentToken";
import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import { toIdString } from "@/schemas/objectId";
import type { PaymentStatus } from "@/schemas/paymentSchema";
import type { Currency } from "@/utils/registrationFee";

export type PaymentLinkView = {
  submissionNumber: string;
  institutionName: string;
  currency: Currency;
  total: number;
  projects: { registrationNumber: string; title: string; amount: number }[];
  status: PaymentStatus;
  receiptUrl: string;
  /** Outstanding after an underpaid receipt. */
  balance: { amount: number; currency: Currency } | null;
  bank: BankDetails | null;
};

function groupStatus(statuses: PaymentStatus[]): PaymentStatus {
  if (statuses.every((status) => status === statuses[0])) return statuses[0];
  if (statuses.includes("PENDING")) return "PENDING";
  if (statuses.includes("AWAITING")) return "AWAITING";
  if (statuses.includes("FAILED")) return "FAILED";
  if (statuses.includes("REVIEW")) return "REVIEW";
  return "PAID";
}

export async function loadPaymentLink(
  token: string
): Promise<PaymentLinkView | null> {
  const trimmed = token.trim();
  if (trimmed.length < 20) return null;

  const submission = await new SubmissionModel().findByPaymentTokenHash(
    hashPaymentToken(trimmed)
  );
  if (!submission) return null;

  const submissionId = toIdString(submission._id);
  const [registrations, payments] = await Promise.all([
    new RegistrationModel().find({ submission_id: submissionId }),
    new PaymentModel().find({ submission_id: submissionId }),
  ]);
  if (payments.length === 0) return null;

  const amountByRegistration = new Map(
    payments.map((payment) => [toIdString(payment.registration_id), payment.amount])
  );

  return {
    submissionNumber: submission.submission_number,
    institutionName: submission.institution.name,
    currency: submission.currency ?? "MYR",
    total: submission.amount,
    projects: registrations
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
    status: groupStatus(payments.map((payment) => payment.status)),
    receiptUrl: payments.find((payment) => payment.receipt_url)?.receipt_url ?? "",
    balance: submission.balance_due
      ? {
          amount: submission.balance_due,
          currency: submission.balance_currency ?? submission.currency ?? "MYR",
        }
      : null,
    bank: readBankDetails(),
  };
}
