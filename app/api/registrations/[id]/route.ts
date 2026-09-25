import { NextRequest } from "next/server";

import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import { registrationStatusUpdateSchema } from "@/schemas/registrationSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSecretarySession } from "@/utils/portalAuth";
import { serializePayment } from "@/utils/serializePayment";
import { serializeRegistration } from "@/utils/serializeRegistration";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSecretarySession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const registration = await new RegistrationModel().findById(id);
    if (!registration) {
      return createResponse({ error: "Registration not found" }, 404);
    }

    const payment = await new PaymentModel().findOne({
      registration_id: toIdString(registration._id),
    });

    return createResponse({
      registration: serializeRegistration(registration),
      payment: payment ? serializePayment(payment) : null,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSecretarySession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const model = new RegistrationModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Registration not found" }, 404);
    }

    const body = await req.json();
    const parsed = registrationStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await model.update(id, parsed.data, registrationStatusUpdateSchema);

    const updated = await model.findById(id);
    if (!updated) {
      return createResponse({ error: "Registration not found" }, 404);
    }

    const payment = await new PaymentModel().findOne({
      registration_id: toIdString(updated._id),
    });

    return createResponse({
      registration: serializeRegistration(updated),
      payment: payment ? serializePayment(payment) : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
