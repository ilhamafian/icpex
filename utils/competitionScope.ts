import "server-only";

import { ObjectId, type Filter } from "mongodb";

import { RegistrationModel } from "@/models/Registration";
import type { Registration } from "@/schemas/registrationSchema";
import { toIdString } from "@/schemas/objectId";

/** Registrations store competition_id as a hex string or an ObjectId. */
export function competitionIdFilter(competitionId: string): Filter<Registration> {
  return {
    competition_id: {
      $in: [competitionId, new ObjectId(competitionId)],
    },
  } as Filter<Registration>;
}

export async function findRegistrationsForCompetition(
  competitionId: string | null
) {
  if (!competitionId) return [];
  return new RegistrationModel().find(competitionIdFilter(competitionId), {
    sort: { created_at: -1 },
  });
}

export function registrationCompetitionId(registration: Registration): string {
  return toIdString(registration.competition_id);
}
