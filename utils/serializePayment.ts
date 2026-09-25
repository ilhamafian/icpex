import "server-only";

import { WithId } from "mongodb";

import type { Payment } from "@/schemas/paymentSchema";
import { toIdString } from "@/schemas/objectId";

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

export type SerializedPayment = {
  _id: string;
  registration_id: string;
  amount: number;
  status: Payment["status"];
  receipt_url: string;
  created_at?: string;
  updated_at?: string;
};

export function serializePayment(payment: WithId<Payment>): SerializedPayment {
  return {
    _id: toIdString(payment._id),
    registration_id: toIdString(payment.registration_id),
    amount: payment.amount,
    status: payment.status,
    receipt_url: payment.receipt_url,
    created_at: toIso(payment.created_at),
    updated_at: toIso(payment.updated_at),
  };
}
