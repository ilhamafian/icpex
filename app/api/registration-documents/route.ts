import { NextRequest } from "next/server";

import { RegistrationModel } from "@/models/Registration";
import { createResponse, handleError } from "@/utils/apiHelper";
import { findRegistrationsForCompetition } from "@/utils/competitionScope";
import { getCurrentCompetitionId } from "@/utils/currentCompetition";
import { documentsZipResponse } from "@/utils/documentZip";
import { requireSession } from "@/utils/portalAuth";
import { canAccessSection } from "@/utils/portalNav";

/**
 * Judge-assignment managers: download documents as a zip — one registration
 * with `?registration=<number>`, otherwise every registration in the current
 * competition, one folder per registration.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!session || !canAccessSection(session.role, "judge-assignments")) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const registrationNumber = req.nextUrl.searchParams.get("registration");
    if (registrationNumber) {
      const registration = await new RegistrationModel().findOne({
        registration_number: registrationNumber,
      });
      if (!registration) {
        return createResponse({ error: "Registration not found" }, 404);
      }
      return documentsZipResponse(
        [registration],
        `${registration.registration_number} documents.zip`,
        { useFolders: false }
      );
    }

    const registrations = await findRegistrationsForCompetition(
      await getCurrentCompetitionId()
    );
    if (registrations.length === 0) {
      return createResponse({ error: "No registrations to download." }, 404);
    }
    const today = new Date().toISOString().slice(0, 10);
    return documentsZipResponse(registrations, `All documents ${today}.zip`, {
      useFolders: true,
    });
  } catch (error) {
    return handleError(error);
  }
}
