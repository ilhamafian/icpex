import "server-only";

import { cache } from "react";
import type { WithId } from "mongodb";

import { CompetitionModel } from "@/models/Competition";
import type { Competition } from "@/schemas/competitionSchema";
import { toIdString } from "@/schemas/objectId";

/**
 * The competition staff roles are scoped to: the published competition with
 * the latest start date. Publishing a newer competition makes it current,
 * which resets secretary and judge access until admins assign new staff.
 */
export const getCurrentCompetition = cache(
  async (): Promise<WithId<Competition> | null> => {
    const [competition] = await new CompetitionModel().find(
      { status: "PUBLISHED" },
      { sort: { start_date: -1 }, limit: 1 }
    );
    return competition ?? null;
  }
);

export async function getCurrentCompetitionId(): Promise<string | null> {
  const competition = await getCurrentCompetition();
  return competition ? toIdString(competition._id) : null;
}
