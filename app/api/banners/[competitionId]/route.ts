import { NextRequest } from "next/server";

import { BannerModel } from "@/models/Banner";
import { CompetitionModel } from "@/models/Competition";
import { bannerInputSchema } from "@/schemas/bannerSchema";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { isBlobStoreUrl } from "@/utils/blobUrl";
import { requireAdminSession } from "@/utils/portalAuth";
import { serializeBanner } from "@/utils/serializeBanner";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ competitionId: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { competitionId } = await params;
    const competition = await new CompetitionModel().findById(competitionId);
    if (!competition) {
      return createResponse({ error: "Competition not found" }, 404);
    }

    const body = await req.json();
    const parsed = bannerInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }
    if (parsed.data.image_url && !isBlobStoreUrl(parsed.data.image_url)) {
      return createResponse(
        { error: "Banner image must be uploaded through the portal." },
        400
      );
    }

    const banner = await new BannerModel().upsertForCompetition(
      toIdString(competition._id),
      parsed.data
    );

    return createResponse({ banner: serializeBanner(banner) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ competitionId: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { competitionId } = await params;
    const model = new BannerModel();
    const existing = await model.findByCompetition(competitionId);
    if (!existing) {
      return createResponse({ error: "Banner not found" }, 404);
    }

    await model.delete(toIdString(existing._id));
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
