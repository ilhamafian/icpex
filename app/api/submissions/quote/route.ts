import { NextRequest } from "next/server";

import { toIdString } from "@/schemas/objectId";
import { MAX_PROJECTS_PER_SUBMISSION } from "@/schemas/registrationSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { quoteSubmission } from "@/utils/pricing";

/** Public: price a submission for the current competition before paying. */
export async function GET(req: NextRequest) {
  try {
    const institution = req.nextUrl.searchParams.get("institution") ?? "";
    const count = Number(req.nextUrl.searchParams.get("count"));
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > MAX_PROJECTS_PER_SUBMISSION
    ) {
      return createResponse(
        { error: `count must be between 1 and ${MAX_PROJECTS_PER_SUBMISSION}.` },
        400
      );
    }

    const competition = await getCurrentCompetition();
    if (!competition) {
      return createResponse(
        { error: "No published competition available for registration." },
        400
      );
    }

    const { fees, freeCount, total } = await quoteSubmission(
      toIdString(competition._id),
      institution,
      count
    );
    return createResponse({ quote: { fees, freeCount, total } });
  } catch (error) {
    return handleError(error);
  }
}
