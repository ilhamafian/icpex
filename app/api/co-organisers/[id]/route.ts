import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { z } from "zod";

import { CoOrganiserModel } from "@/models/CoOrganiser";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSuperAdminSession } from "@/utils/portalAuth";
import { serializeCoOrganiser } from "@/utils/serializeCoOrganiser";

const moveSchema = z.object({
  direction: z.enum(["earlier", "later"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const parsed = moveSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: "Choose a direction." }, 400);
    }

    const { id } = await params;
    const logos = await new CoOrganiserModel().move(id, parsed.data.direction);
    if (!logos) {
      return createResponse({ error: "Co-organiser not found" }, 404);
    }

    revalidatePath("/", "layout");
    return createResponse({ logos: logos.map(serializeCoOrganiser) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const model = new CoOrganiserModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Co-organiser not found" }, 404);
    }

    await model.delete(toIdString(existing._id));
    try {
      await del(existing.image_url);
    } catch (error) {
      console.error("Could not delete co-organiser logo blob:", error);
    }
    revalidatePath("/", "layout");
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
