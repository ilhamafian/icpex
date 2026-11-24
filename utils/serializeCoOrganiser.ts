import "server-only";

import { WithId } from "mongodb";

import type { CoOrganiser } from "@/schemas/coOrganiserSchema";
import { toIdString } from "@/schemas/objectId";

export type SerializedCoOrganiser = {
  _id: string;
  name: string;
  /** Public, cache-busted URL that streams the private blob. */
  image_src: string;
  order: number;
};

export function serializeCoOrganiser(
  logo: WithId<CoOrganiser>
): SerializedCoOrganiser {
  const version = logo.updated_at ? new Date(logo.updated_at).getTime() : 0;
  return {
    _id: toIdString(logo._id),
    name: logo.name,
    image_src: `/api/co-organisers/${toIdString(logo._id)}/image?v=${version}`,
    order: logo.order,
  };
}
