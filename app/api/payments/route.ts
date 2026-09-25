import { NextRequest } from "next/server";

import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import {
  paymentFormSchema,
  paymentInputSchema,
  paymentSchema,
} from "@/schemas/paymentSchema";
import { registrationStatusUpdateSchema } from "@/schemas/registrationSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSecretarySession } from "@/utils/portalAuth";
import { serializePayment } from "@/utils/serializePayment";

async function maybeAdvanceRegistrationOnPaid(
  registrationId: string,
  paymentStatus: string
) {
  if (paymentStatus !== "PAID") return;

  const model = new RegistrationModel();
  const registration = await model.findById(registrationId);
  if (!registration || registration.status !== "SUBMITTED") return;

  await model.update(
    registrationId,
    { status: "REVIEWING" },
    registrationStatusUpdateSchema
  );
}

/** Secretary: list all payments. */
export async function GET() {
  try {
    const session = await requireSecretarySession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const payments = await new PaymentModel().find(
      {},
      { sort: { created_at: -1 } }
    );

    return createResponse({
      payments: payments.map(serializePayment),
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Public create (no `status` → PENDING) or secretary create (optional status).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const hasStatus =
      body != null && typeof body === "object" && "status" in body;
    if (hasStatus) {
      const session = await requireSecretarySession();
      if (!session) {
        return createResponse({ error: "Unauthorized" }, 401);
      }
    }

    const parsed = hasStatus
      ? paymentInputSchema.safeParse(body)
      : paymentFormSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const registrationId = toIdString(parsed.data.registration_id);
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

    const status =
      "status" in parsed.data && parsed.data.status
        ? parsed.data.status
        : "PENDING";

    const created = await new PaymentModel().create(
      paymentSchema.parse({
        registration_id: registrationId,
        amount: parsed.data.amount,
        receipt_url: parsed.data.receipt_url,
        status,
      })
    );

    await maybeAdvanceRegistrationOnPaid(registrationId, status);

    return createResponse({ payment: serializePayment(created) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
