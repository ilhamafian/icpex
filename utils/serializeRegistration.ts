import "server-only";

import { WithId } from "mongodb";

import { SubmissionModel } from "@/models/Submission";
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
  /** Present for registrations made through a multi-project submission. */
  submission_id?: string;
  submission_number?: string;
  /** Fee charged for this project — 0 when it was a free project. */
  fee?: number;
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

/** Submission numbers keyed by submission id, for the given registrations. */
export async function submissionNumbersFor(
  registrations: WithId<Registration>[]
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(
      registrations
        .map((registration) => toIdString(registration.submission_id))
        .filter(Boolean)
    ),
  ];
  if (ids.length === 0) return new Map();

  const model = new SubmissionModel();
  const submissions = await Promise.all(ids.map((id) => model.findById(id)));
  return new Map(
    submissions
      .filter((submission) => submission !== null)
      .map((submission) => [
        toIdString(submission._id),
        submission.submission_number,
      ])
  );
}

export function serializeRegistration(
  registration: WithId<Registration>,
  submissionNumbers: Map<string, string> = new Map()
): SerializedRegistration {
  const submissionId = toIdString(registration.submission_id) || undefined;
  return {
    _id: toIdString(registration._id),
    registration_number: registration.registration_number,
    competition_id: toIdString(registration.competition_id),
    category_id: toIdString(registration.category_id),
    submission_id: submissionId,
    submission_number: submissionId
      ? submissionNumbers.get(submissionId)
      : undefined,
    fee: registration.fee,
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
