import { NextRequest } from "next/server";
import { z } from "zod";

import { createResponse, handleError } from "@/utils/apiHelper";
import { submitAfterPaymentDocuments } from "@/utils/documentUpload";

const bodySchema = z.object({
  documents: z.array(
    z.object({
      requirement_id: z.string().min(1),
      file_name: z.string().min(1),
      file_url: z.string().min(1),
    })
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: "Upload the required documents first." }, 400);
    }

    const result = await submitAfterPaymentDocuments(
      token,
      parsed.data.documents
    );
    if ("error" in result) {
      return createResponse({ error: result.error }, result.status);
    }
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
