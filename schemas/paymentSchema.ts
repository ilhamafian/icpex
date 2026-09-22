import z from "zod";
import { objectIdSchema } from "./objectId";

export const paymentSchema = z.object({
  _id: objectIdSchema.optional(),
  registration_id: objectIdSchema,
  amount: z.number(),
  status: z.enum(["PENDING", "PAID", "FAILED"]),
  receipt_url: z.string().url(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentSchema = paymentSchema.omit({
  _id: true,
  created_at: true,
  updated_at: true,
});

export type CreatePayment = z.infer<typeof createPaymentSchema>;

/** Public payment step after registration details (status set on submit). */
export const paymentFormSchema = createPaymentSchema.omit({
  status: true,
});

export type PaymentForm = z.infer<typeof paymentFormSchema>;
