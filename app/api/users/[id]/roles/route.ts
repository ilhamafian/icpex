import { NextRequest } from "next/server";

import { UserModel } from "@/models/User";
import { roleGrantSchema } from "@/schemas/userSchema";
import { requireAdminSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { hasGrant } from "@/utils/roleGrants";
import { serializeUser } from "@/utils/serializeUser";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const parsed = roleGrantSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const model = new UserModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "User not found" }, 404);
    }

    const scope =
      parsed.data.role === "ADMIN" ? null : parsed.data.competition_id;
    if (!hasGrant(existing.roles, parsed.data.role, scope)) {
      return createResponse({ error: "That role is not assigned." }, 404);
    }

    if (existing.roles.length <= 1) {
      return createResponse(
        { error: "A user must keep at least one role." },
        400
      );
    }

    await model.removeRole(id, parsed.data);
    const updated = await model.findById(id);
    if (!updated) {
      return createResponse({ error: "User not found" }, 404);
    }

    return createResponse({ user: serializeUser(updated) });
  } catch (error) {
    return handleError(error);
  }
}
