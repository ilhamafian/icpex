import { NextRequest } from "next/server";
import { z } from "zod";

import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { replaceAfterPaymentDocument } from "@/utils/documentUpload";
import { requireSecretarySession } from "@/utils/portalAuth";
import { loadSubmissionPaymentGroup } from "@/utils/submissionPayments";
import { educationDenied } from "@/utils/trackAccess";

const bodySchema = z.object({
  requirement_id: z.string().min(1),
  file_name: z.string().min(1),
  file_url: z.string().min(1),
});

export async function POST(
  req: NextRequest,
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

    const denied = educationDenied(
      session.role,
      registration.participant.education_level
    );
    if (denied) return denied;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: "Choose a document to replace." }, 400);
    }

    const result = await replaceAfterPaymentDocument(id, parsed.data);
    if ("error" in result) {
      return createResponse({ error: result.error }, result.status);
    }

    const submissionId = toIdString(registration.submission_id);
    return createResponse({
      group: submissionId
        ? await loadSubmissionPaymentGroup(submissionId)
        : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
