import { NextRequest } from "next/server";

import { getAppOrigin } from "@/lib/appOrigin";
import { sendUserInviteEmail } from "@/lib/email";
import { createInviteToken } from "@/lib/inviteToken";
import { UserModel } from "@/models/User";
import { inviteUserSchema, userSchema } from "@/schemas/userSchema";
import { requireAdminSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeUser } from "@/utils/serializeUser";

function userId(user: { _id: string | { toHexString(): string } }): string {
  return typeof user._id === "string" ? user._id : user._id.toHexString();
}

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
    const model = new UserModel();

    const existing = await model.findByEmail(email);
    if (existing) {
      if (existing.roles.includes(role)) {
        return createResponse(
          { error: "A user with this email and role already exists." },
          409
        );
      }

      const id = userId(existing);
      await model.addRole(id, role);

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
            inviteUrl,
          });
        } catch (emailError) {
          await model.removeRole(id, role);
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
        roles: [role],
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
        inviteUrl,
      });
    } catch (emailError) {
      await model.delete(userId(created));
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
