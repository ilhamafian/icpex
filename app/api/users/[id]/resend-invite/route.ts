import { NextRequest } from "next/server";

import { getAppOrigin } from "@/lib/appOrigin";
import { sendUserInviteEmail } from "@/lib/email";
import { createInviteToken } from "@/lib/inviteToken";
import { UserModel } from "@/models/User";
import type { UserRole } from "@/schemas/userSchema";
import { requireAdminSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeUser } from "@/utils/serializeUser";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const model = new UserModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "User not found" }, 404);
    }

    if (existing.status !== "INVITED") {
      return createResponse(
        { error: "Only invited users can be resent an invite." },
        400
      );
    }

    const { token, tokenHash, expiresAt } = createInviteToken();
    await model.setInviteToken(id, {
      invite_token_hash: tokenHash,
      invite_expires_at: expiresAt,
    });

    const role = existing.roles[0] as UserRole;
    const origin = await getAppOrigin();
    const inviteUrl = `${origin}/invite/${token}`;

    try {
      await sendUserInviteEmail({
        to: existing.email,
        role,
        inviteUrl,
      });
    } catch (emailError) {
      console.error("Resend invite email failed:", emailError);
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

    const updated = await model.findById(id);
    if (!updated) {
      return createResponse({ error: "User not found" }, 404);
    }

    return createResponse({ user: serializeUser(updated) });
  } catch (error) {
    return handleError(error);
  }
}
