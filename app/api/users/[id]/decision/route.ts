import { NextRequest } from "next/server";

import { getAppOrigin } from "@/lib/appOrigin";
import { competitionEmailCopy, sendJudgeAppointmentEmail } from "@/lib/email";
import { CompetitionModel } from "@/models/Competition";
import { UserModel } from "@/models/User";
import { isScoringRole, type UserRole } from "@/schemas/userRole";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireAdminSession } from "@/utils/portalAuth";
import { targetUserDenied } from "@/utils/roleAccess";
import { serializeUser } from "@/utils/serializeUser";
import { z } from "zod";

const decisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

function scoringRole(roles: { role: UserRole }[]): UserRole | undefined {
  return roles.find((grant) => isScoringRole(grant.role))?.role;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: "Choose approve or reject." }, 400);
    }

    const { id } = await params;
    const model = new UserModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "User not found" }, 404);
    }
    if (existing.status !== "PENDING_APPROVAL") {
      return createResponse(
        { error: "This application is no longer waiting for approval." },
        400
      );
    }

    const denied = await targetUserDenied(session, existing.roles);
    if (denied) {
      return createResponse({ error: denied }, 403);
    }

    if (parsed.data.action === "reject") {
      await model.setStatus(id, "DISABLED");
      const updated = await model.findById(id);
      if (!updated) return createResponse({ error: "User not found" }, 404);
      return createResponse({ user: serializeUser(updated) });
    }

    if (!existing.password_hash || !existing.name) {
      return createResponse(
        { error: "This application is missing a name or password." },
        400
      );
    }

    const role = scoringRole(existing.roles);
    const competitionId = existing.roles.find(
      (grant) => grant.competition_id
    )?.competition_id;
    if (!role || !competitionId) {
      return createResponse(
        { error: "This application is not tied to a competition role." },
        400
      );
    }

    const competition = await new CompetitionModel().findById(competitionId);
    if (!competition) {
      return createResponse({ error: "Competition not found." }, 400);
    }

    const origin = await getAppOrigin();
    try {
      await sendJudgeAppointmentEmail({
        to: existing.email,
        name: existing.name,
        role,
        copy: competitionEmailCopy(competition),
        signInUrl: `${origin}/portal/login`,
      });
    } catch (error) {
      console.error("Appointment email failed:", error);
      return createResponse(
        {
          error:
            "Could not send the appointment email. The application is still pending.",
        },
        502
      );
    }

    await model.setStatus(id, "ACTIVE", { email_verified: true });
    const updated = await model.findById(id);
    if (!updated) return createResponse({ error: "User not found" }, 404);
    return createResponse({ user: serializeUser(updated) });
  } catch (error) {
    return handleError(error);
  }
}
