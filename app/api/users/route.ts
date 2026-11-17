import { NextRequest } from "next/server";

import { getAppOrigin } from "@/lib/appOrigin";
import { competitionEmailCopy, sendUserInviteEmail } from "@/lib/email";
import { createInviteToken } from "@/lib/inviteToken";
import { CompetitionModel } from "@/models/Competition";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import type { Competition } from "@/schemas/competitionSchema";
import { inviteUserSchema, userSchema, type RoleGrant } from "@/schemas/userSchema";
import { isGlobalRole } from "@/schemas/userRole";
import type { WithId } from "mongodb";
import { requireAdminSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { grantDenied } from "@/utils/roleAccess";
import { hasGrant } from "@/utils/roleGrants";
import { serializeUser } from "@/utils/serializeUser";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const users = await new UserModel().find({}, { sort: { created_at: -1 } });

    return createResponse({
      users: users.map(serializeUser),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = inviteUserSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const email = parsed.data.email.toLowerCase();
    const role = parsed.data.role;
    const denied = await grantDenied(
      session,
      role,
      parsed.data.competition_id
        ? toIdString(parsed.data.competition_id)
        : undefined
    );
    if (denied) {
      return createResponse({ error: denied }, 403);
    }

    let grant: RoleGrant = { role };
    let competitionName: string | undefined;
    let competition: WithId<Competition> | null = null;
    if (!isGlobalRole(role)) {
      if (!parsed.data.competition_id) {
        return createResponse(
          { error: "Choose the competition this role is for." },
          400
        );
      }
      competition = await new CompetitionModel().findById(
        toIdString(parsed.data.competition_id)
      );
      if (!competition) {
        return createResponse({ error: "Competition not found." }, 400);
      }
      grant = { role, competition_id: toIdString(competition._id) };
      competitionName = competition.name;
    }

    const model = new UserModel();
    const existing = await model.findByEmail(email);
    if (existing) {
      if (hasGrant(existing.roles, role, grant.competition_id)) {
        return createResponse(
          {
            error: competitionName
              ? `This user already has that role in ${competitionName}.`
              : "This user is already an administrator.",
          },
          409
        );
      }

      const id = toIdString(existing._id);
      await model.addRole(id, grant);

      // Pending invites: refresh token and email so they get the new role.
      // Active users can already sign in; just add the role.
      if (existing.status === "INVITED") {
        const { token, tokenHash, expiresAt } = createInviteToken();
        await model.setInviteToken(id, {
          invite_token_hash: tokenHash,
          invite_expires_at: expiresAt,
        });

        const origin = await getAppOrigin();
        const inviteUrl = `${origin}/invite/${token}`;

        try {
          await sendUserInviteEmail({
            to: email,
            role,
            competitionName,
            copy: competition ? competitionEmailCopy(competition) : undefined,
            name: existing.name,
            inviteUrl,
          });
        } catch (emailError) {
          await model.removeRole(id, grant);
          console.error("Invite email failed:", emailError);
          return createResponse(
            {
              error:
                emailError instanceof Error
                  ? emailError.message
                  : "Failed to send invite email.",
            },
            502
          );
        }
      }

      const updated = await model.findById(id);
      if (!updated) {
        return createResponse({ error: "User not found" }, 404);
      }

      return createResponse({
        user: serializeUser(updated),
        roleAdded: true,
      });
    }

    const { token, tokenHash, expiresAt } = createInviteToken();
    const created = await model.create(
      userSchema.parse({
        email,
        roles: [grant],
        status: "INVITED",
        email_verified: false,
        invite_token_hash: tokenHash,
        invite_expires_at: expiresAt,
      })
    );

    const origin = await getAppOrigin();
    const inviteUrl = `${origin}/invite/${token}`;

    try {
      await sendUserInviteEmail({
        to: email,
        role,
        competitionName,
        copy: competition ? competitionEmailCopy(competition) : undefined,
        inviteUrl,
      });
    } catch (emailError) {
      await model.delete(toIdString(created._id));
      console.error("Invite email failed:", emailError);
      return createResponse(
        {
          error:
            emailError instanceof Error
              ? emailError.message
              : "Failed to send invite email.",
        },
        502
      );
    }

    return createResponse({ user: serializeUser(created) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
