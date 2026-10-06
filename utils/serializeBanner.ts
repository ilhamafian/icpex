import "server-only";

import { WithId } from "mongodb";

import type { Banner } from "@/schemas/bannerSchema";
import { toIdString } from "@/schemas/objectId";

export type SerializedBanner = {
  _id: string;
  competition_id: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  /** Raw private blob URL — only useful to the server. */
  image_url: string;
  /** Public, cache-busted URL that streams the private blob. */
  image_src: string | null;
  updated_at?: string;
};

export function bannerImageSrc(banner: WithId<Banner>): string | null {
  if (!banner.image_url) return null;
  const version = banner.updated_at
    ? new Date(banner.updated_at).getTime()
    : 0;
  return `/api/banners/${banner.competition_id}/image?v=${version}`;
}

export function serializeBanner(banner: WithId<Banner>): SerializedBanner {
  return {
    _id: toIdString(banner._id),
    competition_id: banner.competition_id,
    eyebrow: banner.eyebrow ?? "",
    headline: banner.headline,
    subheadline: banner.subheadline ?? "",
    image_url: banner.image_url ?? "",
    image_src: bannerImageSrc(banner),
    updated_at: banner.updated_at
      ? new Date(banner.updated_at).toISOString()
      : undefined,
  };
}
