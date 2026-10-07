import z from "zod";
import { objectIdSchema } from "./objectId";

export const paymentStatusSchema = z.enum(["PENDING", "PAID", "FAILED"]);

export const paymentSchema = z.object({
  _id: objectIdSchema.optional(),
  registration_id: objectIdSchema,
  /** Payments from one multi-project submission share a receipt. */
  submission_id: objectIdSchema.optional(),
  /** 0 for a free project. */
  amount: z.number().nonnegative(),
  status: paymentStatusSchema,
  /** Omitted only when the whole submission was free. */
  receipt_url: z.string().url().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Payment = z.infer<typeof paymentSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const createPaymentSchema = paymentSchema.omit({
  _id: true,
  created_at: true,
  updated_at: true,
});

export type CreatePayment = z.infer<typeof createPaymentSchema>;

/** Public payment step for a single legacy registration (status set on submit). */
export const paymentFormSchema = createPaymentSchema
  .omit({ status: true, submission_id: true })
  .extend({ receipt_url: z.string().url() });

export type PaymentForm = z.infer<typeof paymentFormSchema>;

/** Secretary create — can set status (defaults to PENDING on the server if omitted). */
export const paymentInputSchema = z.object({
  registration_id: objectIdSchema,
  amount: z.number().positive(),
  receipt_url: z.string().url(),
  status: paymentStatusSchema.optional(),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

/** Secretary update — verify status, adjust amount / receipt. */
export const paymentUpdateSchema = z.object({
  amount: z.number().nonnegative().optional(),
  status: paymentStatusSchema.optional(),
  receipt_url: z.string().url().optional(),
});

export type PaymentUpdate = z.infer<typeof paymentUpdateSchema>;
