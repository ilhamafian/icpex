import { NextRequest } from "next/server";

import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import { livePresentationNominationSchema } from "@/schemas/registrationSchema";
import { canManageLivePresentation } from "@/schemas/userRole";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { requireJudgeLeaderSession } from "@/utils/portalAuth";

/** Nominate or clear a postgraduate participant for the 5MT live session. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireJudgeLeaderSession();
    if (!session || !canManageLivePresentation(session.role)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const competition = await getCurrentCompetition();
    if (!competition) {
      return createResponse(
        { error: "No published competition is open." },
        400
      );
    }

    const { id } = await params;
    const model = new RegistrationModel();
    const registration = await model.findById(id);
    if (!registration) {
      return createResponse({ error: "Registration not found" }, 404);
    }
    if (toIdString(registration.competition_id) !== toIdString(competition._id)) {
      return createResponse(
        { error: "This registration is not in the current competition." },
        400
      );
    }
    if (registration.participant.education_level !== "POSTGRADUATE") {
      return createResponse(
        { error: "Only postgraduate participants can be nominated." },
        400
      );
    }
    if (registration.live_presentation_invited_at) {
      return createResponse(
        { error: "This participant has already been invited." },
        400
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = livePresentationNominationSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: "Choose whether to nominate this participant." }, 400);
    }

    await model.setLivePresentationNomination(id, parsed.data.nominated);
    return createResponse({ nominated: parsed.data.nominated });
  } catch (error) {
    return handleError(error);
  }
}
