import { NextRequest } from "next/server";

import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSecretarySession } from "@/utils/portalAuth";
import { loadSubmissionPaymentGroup } from "@/utils/submissionPayments";

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
    const group = await loadSubmissionPaymentGroup(id);
    if (!group) {
      return createResponse({ error: "Submission not found" }, 404);
    }

    return createResponse({ group });
  } catch (error) {
    return handleError(error);
  }
}
