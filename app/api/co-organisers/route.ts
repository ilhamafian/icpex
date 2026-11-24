import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

import { CoOrganiserModel } from "@/models/CoOrganiser";
import {
  MAX_CO_ORGANISERS,
  coOrganiserInputSchema,
} from "@/schemas/coOrganiserSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { isBlobStoreUrl } from "@/utils/blobUrl";
import { requireSuperAdminSession } from "@/utils/portalAuth";
import { serializeCoOrganiser } from "@/utils/serializeCoOrganiser";

export async function GET() {
  try {
    const session = await requireSuperAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const logos = await new CoOrganiserModel().list();
    return createResponse({ logos: logos.map(serializeCoOrganiser) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const model = new CoOrganiserModel();
    const existing = await model.list();
    if (existing.length >= MAX_CO_ORGANISERS) {
      return createResponse(
        { error: `You can add up to ${MAX_CO_ORGANISERS} co-organiser logos.` },
        400
      );
    }

    const parsed = coOrganiserInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse(
        { error: parsed.error.issues[0]?.message ?? "Invalid co-organiser." },
        400
      );
    }
    if (!isBlobStoreUrl(parsed.data.image_url)) {
      return createResponse(
        { error: "Logo must be uploaded through the portal." },
        400
      );
    }

    const created = await model.create({
      ...parsed.data,
      order: await model.nextOrder(),
    });
    revalidatePath("/", "layout");
    return createResponse({ logo: serializeCoOrganiser(created) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
