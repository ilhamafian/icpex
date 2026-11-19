import "server-only";

import { ObjectId, type Filter } from "mongodb";

import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import type { Registration } from "@/schemas/registrationSchema";
import type { Submission } from "@/schemas/submissionSchema";
import type { UserRole } from "@/schemas/userRole";
import { usersWithRolesFilter } from "@/utils/roleGrants";

const CEREMONY_JUDGE_ROLES: UserRole[] = [
  "POSTGRAD_JUDGE",
  "UNDERGRAD_JUDGE",
  "POSTGRAD_JUDGE_LEADER",
  "UNDERGRAD_JUDGE_LEADER",
];

function idMatchValues(id: string) {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

export type ClosingCeremonyParticipant = {
  to: string;
  name: string;
  registrationNumber: string;
};

export type ClosingCeremonyJudge = {
  to: string;
  name: string;
};

/** Registrations on a paid submission, including free and complimentary projects. */
export async function loadClosingCeremonyParticipants(
  competitionId: string
): Promise<ClosingCeremonyParticipant[]> {
  const submissions = await new SubmissionModel().find({
    competition_id: { $in: idMatchValues(competitionId) },
    paid_at: { $exists: true, $ne: null },
  } as unknown as Filter<Submission>);

  const registrationIds = [
    ...new Set(
      submissions.flatMap((submission) =>
        submission.registration_ids.map((id) => toIdString(id))
      )
    ),
  ].filter(Boolean);
  if (registrationIds.length === 0) return [];

  const registrations = await new RegistrationModel().find({
    _id: { $in: registrationIds.flatMap((id) => idMatchValues(id)) },
  } as unknown as Filter<Registration>);

  const seen = new Set<string>();
  const recipients: ClosingCeremonyParticipant[] = [];
  for (const registration of registrations) {
    if (toIdString(registration.competition_id) !== competitionId) continue;
    if (registration.status === "REJECTED") continue;
    const id = toIdString(registration._id);
    if (!id || seen.has(id)) continue;
    const to = registration.participant.email.trim();
    if (!to) continue;
    seen.add(id);
    recipients.push({
      to,
      name: registration.participant.name,
      registrationNumber: registration.registration_number,
    });
  }
  return recipients;
}

/** One email per address for scoring judges and judge leaders. */
export async function loadClosingCeremonyJudges(
  competitionId: string
): Promise<ClosingCeremonyJudge[]> {
  const users = await new UserModel().find(
    usersWithRolesFilter(CEREMONY_JUDGE_ROLES, competitionId)
  );
  const seen = new Set<string>();
  const recipients: ClosingCeremonyJudge[] = [];
  for (const user of users) {
    const to = user.email.trim();
    const key = to.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    recipients.push({ to, name: user.name?.trim() || "Judge" });
  }
  return recipients;
}
