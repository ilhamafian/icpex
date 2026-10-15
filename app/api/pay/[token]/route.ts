import { NextRequest } from "next/server";
import { z } from "zod";

import { hashPaymentToken } from "@/lib/paymentToken";
import { PaymentModel } from "@/models/Payment";
import { SubmissionModel } from "@/models/Submission";
import { toIdString } from "@/schemas/objectId";
import { paymentUpdateSchema } from "@/schemas/paymentSchema";
import { createResponse, handleError } from "@/utils/apiHelper";

const receiptSchema = z.object({
  receipt_url: z.string().url(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const submission = await new SubmissionModel().findByPaymentTokenHash(
      hashPaymentToken(token)
    );
    if (!submission) {
      return createResponse({ error: "This payment link is invalid." }, 404);
    }

    const body = await req.json();
    const parsed = receiptSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: "Upload a receipt before submitting." }, 400);
    }

    const submissionId = toIdString(submission._id);
    const payments = await new PaymentModel().find({
      submission_id: submissionId,
    });
    if (payments.length === 0) {
      return createResponse({ error: "This payment link is invalid." }, 404);
    }

    const open = payments.every(
      (payment) => payment.status === "AWAITING" || payment.status === "PENDING"
    );
    if (!open) {
      return createResponse(
        {
          error:
            payments.some((payment) => payment.status === "PAID")
              ? "This payment has already been received."
              : "This payment link is no longer accepting a receipt.",
        },
        400
      );
    }

    const model = new PaymentModel();
    for (const payment of payments) {
      await model.update(
        toIdString(payment._id),
        { status: "PENDING", receipt_url: parsed.data.receipt_url },
        paymentUpdateSchema
      );
    }

    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
