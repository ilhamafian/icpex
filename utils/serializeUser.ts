import "server-only";

import { WithId } from "mongodb";

import type { User } from "@/schemas/userSchema";
import { toIdString } from "@/schemas/objectId";
import type { SerializedUser } from "@/types/user";

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

export type { SerializedUser };

export function serializeUser(user: WithId<User>): SerializedUser {
  return {
    _id: toIdString(user._id),
    email: user.email,
    name: user.name,
    roles: user.roles,
    status: user.status,
    email_verified: user.email_verified,
    invite_expires_at: toIso(user.invite_expires_at),
    created_at: toIso(user.created_at),
    updated_at: toIso(user.updated_at),
  };
}
