import { NextRequest } from "next/server";

import { UserModel } from "@/models/User";
import { requireAdminSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { targetUserDenied } from "@/utils/roleAccess";

export async function DELETE(
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

    const denied = await targetUserDenied(session, existing.roles);
    if (denied) {
      return createResponse({ error: denied }, 403);
    }

    await model.delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
