import { get } from "@vercel/blob";
import { NextRequest } from "next/server";

import { CoOrganiserModel } from "@/models/CoOrganiser";
import { createResponse, handleError } from "@/utils/apiHelper";

/** Public: streams the private blob behind a co-organiser logo. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logo = await new CoOrganiserModel().findById(id);
    if (!logo?.image_url) {
      return createResponse({ error: "Not found" }, 404);
    }

    const result = await get(logo.image_url, { access: "private" });
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
