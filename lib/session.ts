import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { z } from "zod";

import { UserModel } from "@/models/User";
import { userRoleSchema, type UserRole } from "@/schemas/userRole";
import { getCurrentCompetitionId } from "@/utils/currentCompetition";
import { rolesForCompetition } from "@/utils/roleGrants";

export const SESSION_COOKIE = "icpex_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** What the signed cookie stores: identity and the role the user picked. */
type SessionToken = {
  role: UserRole;
  username: string;
  /** "env" for the ADMIN_USERNAME / ADMIN_PASSWORD login (no DB user). */
  source?: "env";
  exp: number;
};

export type SessionPayload = SessionToken & {
  /** Roles available right now, resolved per request for the current competition. */
  roles: UserRole[];
  competition_id: string | null;
};

const sessionTokenSchema = z.object({
  role: userRoleSchema,
  username: z.string(),
  source: z.literal("env").optional(),
  exp: z.number(),
});

function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ??
    process.env.ADMIN_PASSWORD ??
    process.env.ADMIN_USERNAME;

  if (!secret) {
    throw new Error("Missing SESSION_SECRET or ADMIN credentials for sessions");
  }

  return secret;
}

function encodeToken(token: SessionToken): string {
  return Buffer.from(JSON.stringify(token), "utf8").toString("base64url");
}

function decodeToken(encoded: string): SessionToken | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = sessionTokenSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

function sealSession(token: SessionToken): string {
  const body = encodeToken(token);
  return `${body}.${sign(body)}`;
}

function unsealSession(value: string | undefined): SessionToken | null {
  if (!value) return null;

  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  if (!safeEqual(sign(body), signature)) return null;

  const token = decodeToken(body);
  if (!token) return null;
  if (token.exp < Date.now()) return null;

  return token;
}

/** Roles a DB user can act as in the current competition (empty if none). */
export async function resolveUserRoles(
  email: string,
  competitionId: string | null
): Promise<UserRole[]> {
  const user = await new UserModel().findByEmail(email.toLowerCase());
  if (!user || user.status !== "ACTIVE") return [];
  return rolesForCompetition(user.roles, competitionId);
}

export async function createSession(
  username: string,
  role: UserRole,
  options: { source?: "env" } = {}
): Promise<void> {
  const token = sealSession({
    role,
    username,
    ...(options.source ? { source: options.source } : {}),
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** @deprecated Prefer createSession(username, role, { source: "env" }) */
export async function createAdminSession(username: string): Promise<void> {
  await createSession(username, "ADMIN", { source: "env" });
}

/**
 * Current session with roles resolved for the current competition. Returns
 * null when the user no longer holds any role (e.g. a judge from a previous
 * competition), which signs them out everywhere at once.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = unsealSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!token) return null;

  const competitionId = await getCurrentCompetitionId();
  const roles: UserRole[] =
    token.source === "env"
      ? ["ADMIN"]
      : await resolveUserRoles(token.username, competitionId);

  const [fallbackRole] = roles;
  if (!fallbackRole) return null;

  return {
    ...token,
    role: roles.includes(token.role) ? token.role : fallbackRole,
    roles,
    competition_id: competitionId,
  };
});

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function verifyEnvAdminCredentials(
  username: string,
  password: string
): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  return (
    safeEqual(username, expectedUsername) &&
    safeEqual(password, expectedPassword)
  );
}
