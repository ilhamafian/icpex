import type { PaymentStatus } from "@/schemas/paymentSchema";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  REVIEW: "To review",
  AWAITING: "Awaiting payment",
  PENDING: "To verify",
  PAID: "Paid",
  FAILED: "Failed",
};
