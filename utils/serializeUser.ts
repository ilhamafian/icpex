import "server-only";

import { WithId } from "mongodb";

import type { User } from "@/schemas/userSchema";
import { toIdString } from "@/schemas/objectId";
import type { SerializedJudgeProfile, SerializedUser } from "@/types/user";

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

export type { SerializedUser };

function serializeJudgeProfile(
  profile: NonNullable<User["judge_profile"]>
): SerializedJudgeProfile {
  return {
    institution: {
      name: profile.institution.name,
      country: profile.institution.country,
    },
    institution_key: profile.institution_key,
    category_ids: profile.category_ids.map((id) => toIdString(id)),
    education_eligibility: profile.education_eligibility,
  };
}

export function serializeUser(user: WithId<User>): SerializedUser {
  return {
    _id: toIdString(user._id),
    email: user.email,
    name: user.name,
    roles: user.roles,
    status: user.status,
    email_verified: user.email_verified,
    invite_expires_at: toIso(user.invite_expires_at),
    judge_profile: user.judge_profile
      ? serializeJudgeProfile(user.judge_profile)
      : undefined,
    created_at: toIso(user.created_at),
    updated_at: toIso(user.updated_at),
  };
}
