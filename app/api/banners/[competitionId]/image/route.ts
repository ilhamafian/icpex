import { get } from "@vercel/blob";
import { NextRequest } from "next/server";

import { BannerModel } from "@/models/Banner";
import { createResponse, handleError } from "@/utils/apiHelper";

/** Public: streams the private blob behind a competition's banner image. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ competitionId: string }> }
) {
  try {
    const { competitionId } = await params;
    const banner = await new BannerModel().findByCompetition(competitionId);
    if (!banner?.image_url) {
      return createResponse({ error: "Not found" }, 404);
    }

    const result = await get(banner.image_url, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return createResponse({ error: "Not found" }, 404);
    }

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
