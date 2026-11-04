import "server-only";

import { RegistrationModel } from "@/models/Registration";
import { UserModel } from "@/models/User";
import type { JudgeAssignmentType } from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";
import type { UserRole } from "@/schemas/userRole";
import {
  educationLevelForRole,
  judgeRoleForEducation,
  USER_ROLE_LABELS,
} from "@/schemas/userRole";
import { registrationCompetitionId } from "@/utils/competitionScope";
import { judgeProfileBlockReason } from "@/utils/judgeEligibility";
import { hasGrant } from "@/utils/roleGrants";

export async function validateAssignmentRefs(input: {
  judge_id: string;
  registration_number: string;
  type: JudgeAssignmentType;
  /** Active role of the person creating the assignment. */
  actorRole?: UserRole;
}) {
  const registration = await new RegistrationModel().findOne({
    registration_number: input.registration_number,
  });
  if (!registration) {
    return { error: "Registration not found.", status: 400 as const };
  }

  const educationLevel = registration.participant.education_level;
  if (
    input.actorRole &&
    educationLevelForRole(input.actorRole) &&
    educationLevelForRole(input.actorRole) !== educationLevel
  ) {
    return {
      error: "This registration is outside your education track.",
      status: 403 as const,
    };
  }

  const judge = await new UserModel().findById(input.judge_id);
  if (!judge) {
    return { error: "Judge not found.", status: 400 as const };
  }

  const requiredRole = judgeRoleForEducation(educationLevel);
  if (
    !hasGrant(
      judge.roles,
      requiredRole,
      registrationCompetitionId(registration)
    )
  ) {
    return {
      error: `Judge must have the ${USER_ROLE_LABELS[requiredRole]} role in this registration's competition.`,
      status: 400 as const,
    };
  }

  if (judge.status === "DISABLED") {
    return { error: "Cannot assign a disabled judge.", status: 400 as const };
  }

  if (judge.status !== "ACTIVE") {
    return {
      error: "This judge has not accepted their invitation yet.",
      status: 400 as const,
    };
  }

  const reason = judgeProfileBlockReason(judge.judge_profile, {
    category_id: toIdString(registration.category_id),
    education_level: educationLevel,
    institution_key: registration.institution_key,
    institution_name: registration.participant.institution.name,
  });
  if (reason) {
    return { error: reason, status: 400 as const };
  }

  return { registration, judge };
}
