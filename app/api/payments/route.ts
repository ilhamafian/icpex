import { NextRequest } from "next/server";

import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import {
  paymentFormSchema,
  paymentSchema,
} from "@/schemas/paymentSchema";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = paymentFormSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const registrationId = String(parsed.data.registration_id);
    const registration = await new RegistrationModel().findById(registrationId);
    if (!registration) {
      return createResponse({ error: "Registration not found." }, 404);
    }

    const existing = await new PaymentModel().findOne({
      registration_id: registrationId,
    });
    if (existing) {
      return createResponse(
        { error: "A payment already exists for this registration." },
        409
      );
    }

    const created = await new PaymentModel().create(
      paymentSchema.parse({
        ...parsed.data,
        registration_id: registrationId,
        status: "PENDING",
      })
    );

    return createResponse(
      {
        payment: {
          _id: toIdString(created._id),
          registration_id: toIdString(created.registration_id),
          amount: created.amount,
          status: created.status,
          receipt_url: created.receipt_url,
        },
      },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
