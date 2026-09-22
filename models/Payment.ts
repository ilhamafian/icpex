import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { Payment, paymentSchema } from "@/schemas/paymentSchema";

export class PaymentModel extends ModelBase<Payment> {
  protected collectionName = "payments";
  protected schema: ZodSchema<Payment> = paymentSchema;
}
