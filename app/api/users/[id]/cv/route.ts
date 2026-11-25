import { get } from "@vercel/blob";
import { NextRequest } from "next/server";

import { UserModel } from "@/models/User";
import { createResponse, handleError } from "@/utils/apiHelper";
import { isBlobStoreUrl } from "@/utils/blobUrl";
import { safeFileName } from "@/utils/documentZip";
import { requireAdminSession } from "@/utils/portalAuth";
import { targetUserDenied } from "@/utils/roleAccess";

/** Streams a private CV for an admin who may review that applicant. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const user = await new UserModel().findById(id);
    const cvUrl = user?.judge_application?.cv_url;
    if (!user || !cvUrl || !isBlobStoreUrl(cvUrl)) {
      return createResponse({ error: "Not found" }, 404);
    }

    const denied = await targetUserDenied(session, user.roles);
    if (denied) {
      return createResponse({ error: denied }, 403);
    }

    const result = await get(cvUrl, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return createResponse({ error: "Not found" }, 404);
    }

    const fileName = safeFileName(user.judge_application?.cv_file_name ?? "cv");
    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
