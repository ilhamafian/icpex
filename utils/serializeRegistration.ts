import "server-only";

import { WithId } from "mongodb";

import type { Registration } from "@/schemas/registrationSchema";
import { toIdString } from "@/schemas/objectId";

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

export type SerializedRegistration = {
  _id: string;
  registration_number: string;
  competition_id: string;
  category_id: string;
  participant: {
    name: string;
    email: string;
    phone: string;
    education_level: Registration["participant"]["education_level"];
    institution: {
      name: string;
      country: string;
    };
  };
  project: {
    title: string;
    abstract: string;
  };
  status: Registration["status"];
  created_at?: string;
  updated_at?: string;
};

export function serializeRegistration(
  registration: WithId<Registration>
): SerializedRegistration {
  return {
    _id: toIdString(registration._id),
    registration_number: registration.registration_number,
    competition_id: toIdString(registration.competition_id),
    category_id: toIdString(registration.category_id),
    participant: {
      name: registration.participant.name,
      email: registration.participant.email,
      phone: registration.participant.phone,
      education_level: registration.participant.education_level,
      institution: {
        name: registration.participant.institution.name,
        country: registration.participant.institution.country,
      },
    },
    project: {
      title: registration.project.title,
      abstract: registration.project.abstract,
    },
    status: registration.status,
    created_at: toIso(registration.created_at),
    updated_at: toIso(registration.updated_at),
  };
}
