import { NextRequest } from "next/server";

import { submissionFeesSchema } from "@/schemas/submissionSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSecretarySession } from "@/utils/portalAuth";
import {
  applySubmissionFees,
  loadSubmissionPaymentGroup,
} from "@/utils/submissionPayments";

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
    const body = await req.json();
    const parsed = submissionFeesSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: "Enter a valid fee for every project." }, 400);
    }

    const applied = await applySubmissionFees(id, parsed.data.fees);
    if ("error" in applied) {
      return createResponse({ error: applied.error }, 400);
    }

    const group = await loadSubmissionPaymentGroup(id);
    if (!group) {
      return createResponse({ error: "Submission not found" }, 404);
    }

    return createResponse({ group });
  } catch (error) {
    return handleError(error);
  }
}
