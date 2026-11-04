import "server-only";

import { RegistrationModel } from "@/models/Registration";
import type { EducationLevel } from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import type { Registration } from "@/schemas/registrationSchema";
import {
  educationLevelForRole,
  type UserRole,
} from "@/schemas/userRole";
import { createResponse } from "@/utils/apiHelper";

export function canAccessEducationLevel(
  role: UserRole,
  level: EducationLevel
): boolean {
  const track = educationLevelForRole(role);
  return track === null || track === level;
}

export function filterByEducationLevel<T extends Registration>(
  role: UserRole,
  registrations: T[]
): T[] {
  const track = educationLevelForRole(role);
  if (!track) return registrations;
  return registrations.filter(
    (registration) => registration.participant.education_level === track
  );
}

/** 403 when this role cannot see the education level. Null when allowed. */
export function educationDenied(role: UserRole, level: EducationLevel) {
  if (canAccessEducationLevel(role, level)) return null;
  return createResponse({ error: "Forbidden" }, 403);
}

export async function denyUnlessRegistration(
  role: UserRole,
  registrationId: string
) {
  const registration = await new RegistrationModel().findById(registrationId);
  if (!registration) {
    return createResponse({ error: "Registration not found" }, 404);
  }
  return educationDenied(role, registration.participant.education_level);
}

/**
 * Submission actions apply to every project. A track role may act only when
 * every project is in that track.
 */
export async function denyUnlessSubmission(role: UserRole, submissionId: string) {
  const track = educationLevelForRole(role);
  if (!track) return null;

  const registrations = await new RegistrationModel().find({
    submission_id: submissionId,
  });
  if (
    registrations.length === 0 ||
    registrations.some(
      (registration) => registration.participant.education_level !== track
    )
  ) {
    return createResponse({ error: "Forbidden" }, 403);
  }
  return null;
}

export async function registrationIdsForRole(role: UserRole): Promise<Set<string> | null> {
  const track = educationLevelForRole(role);
  if (!track) return null;
  const registrations = await new RegistrationModel().find({
    "participant.education_level": track,
  });
  return new Set(registrations.map((registration) => toIdString(registration._id)));
}
