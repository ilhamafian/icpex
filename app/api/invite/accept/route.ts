import { NextRequest } from "next/server";

import { hashInviteToken } from "@/lib/inviteToken";
import { hashPassword } from "@/lib/password";
import { UserModel } from "@/models/User";
import { acceptInviteSchema } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { toIdString } from "@/schemas/objectId";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return createResponse({ error: "Missing invite token." }, 400);
    }

    const model = new UserModel();
    const user = await model.findByInviteTokenHash(hashInviteToken(token));
    if (!user || user.status !== "INVITED") {
      return createResponse({ error: "Invalid or expired invitation." }, 404);
    }

    if (
      user.invite_expires_at &&
      new Date(user.invite_expires_at).getTime() < Date.now()
    ) {
      return createResponse({ error: "This invitation has expired." }, 410);
    }

    return createResponse({
      email: user.email,
      roles: user.roles,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = acceptInviteSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const model = new UserModel();
    const user = await model.findByInviteTokenHash(
      hashInviteToken(parsed.data.token)
    );

    if (!user || user.status !== "INVITED") {
      return createResponse({ error: "Invalid or expired invitation." }, 404);
    }

    if (
      user.invite_expires_at &&
      new Date(user.invite_expires_at).getTime() < Date.now()
    ) {
      return createResponse({ error: "This invitation has expired." }, 410);
    }

    const password_hash = await hashPassword(parsed.data.password);
    const id = toIdString(user._id);

    await model.activateFromInvite(id, {
      password_hash,
      name: parsed.data.name,
    });

    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
