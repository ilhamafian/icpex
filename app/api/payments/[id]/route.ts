import { WithId } from "mongodb";
import { NextRequest } from "next/server";

import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import {
  paymentUpdateSchema,
  type Payment,
  type PaymentUpdate,
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

/**
 * Payments from one submission share a single receipt, so verifying (or
 * failing, or replacing the receipt of) one applies to all of them.
 */
async function syncSubmissionSiblings(
  paymentId: string,
  submissionId: Payment["submission_id"],
  changes: Pick<PaymentUpdate, "status" | "receipt_url">
): Promise<WithId<Payment>[]> {
  if (!submissionId) return [];
  const shared = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined)
  ) as PaymentUpdate;
  if (Object.keys(shared).length === 0) return [];

  const model = new PaymentModel();
  const siblings = (
    await model.find({ submission_id: toIdString(submissionId) })
  ).filter((payment) => toIdString(payment._id) !== paymentId);

  for (const sibling of siblings) {
    await model.update(toIdString(sibling._id), shared, paymentUpdateSchema);
  }
  return siblings.map((sibling) => ({ ...sibling, ...shared }));
}

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
    const payment = await new PaymentModel().findById(id);
    if (!payment) {
      return createResponse({ error: "Payment not found" }, 404);
    }

    return createResponse({ payment: serializePayment(payment) });
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
    const model = new PaymentModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Payment not found" }, 404);
    }

    const body = await req.json();
    const parsed = paymentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    if (
      parsed.data.amount === undefined &&
      parsed.data.status === undefined &&
      parsed.data.receipt_url === undefined
    ) {
      return createResponse(
        { error: "At least one field is required." },
        400
      );
    }

    await model.update(id, parsed.data, paymentUpdateSchema);

    const updated = await model.findById(id);
    if (!updated) {
      return createResponse({ error: "Payment not found" }, 404);
    }

    const siblings = await syncSubmissionSiblings(id, updated.submission_id, {
      status: parsed.data.status,
      receipt_url: parsed.data.receipt_url,
    });

    if (parsed.data.status) {
      for (const payment of [updated, ...siblings]) {
        await maybeAdvanceRegistrationOnPaid(
          toIdString(payment.registration_id),
          parsed.data.status
        );
      }
    }

    return createResponse({
      payment: serializePayment(updated),
      siblings: siblings.map(serializePayment),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSecretarySession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const model = new PaymentModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Payment not found" }, 404);
    }

    await model.delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
