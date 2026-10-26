import { get } from "@vercel/blob";
import { NextRequest } from "next/server";

import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { isBlobStoreUrl } from "@/utils/blobUrl";
import { registrationCompetitionId } from "@/utils/competitionScope";
import { safeFileName } from "@/utils/documentZip";
import { judgeTypesForRoles } from "@/utils/judgeTypes";
import { requireJudgeSession } from "@/utils/portalAuth";
import { resolveJudgeUser } from "@/utils/resolveJudgeUser";

/** Streams one private registration file for the judge who owns this assignment. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireJudgeSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }
    const judge = await resolveJudgeUser(session);
    if (!judge) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const indexParam = req.nextUrl.searchParams.get("index");
    const index = Number(indexParam);
    if (indexParam === null || !Number.isInteger(index) || index < 0) {
      return createResponse({ error: "Invalid document" }, 400);
    }

    const { id } = await params;
    const assignment = await new JudgeAssignmentModel().findById(id);
    if (
      !assignment ||
      toIdString(assignment.judge_id) !== judge._id ||
      !judgeTypesForRoles(judge.roles).includes(assignment.type)
    ) {
      return createResponse({ error: "Forbidden" }, 403);
    }

    const registration = await new RegistrationModel().findOne({
      registration_number: assignment.registration_number,
    });
    if (
      !registration ||
      registrationCompetitionId(registration) !== session.competition_id
    ) {
      return createResponse({ error: "Forbidden" }, 403);
    }

    const doc = registration.documents[index];
    if (!doc || doc.type === "VIDEO_LINK" || !isBlobStoreUrl(doc.file_url)) {
      return createResponse({ error: "Not found" }, 404);
    }

    const result = await get(doc.file_url, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return createResponse({ error: "Not found" }, 404);
    }

    const fileName = safeFileName(doc.file_name);
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
