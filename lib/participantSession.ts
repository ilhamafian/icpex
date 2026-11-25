import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { z } from "zod";

import { ParticipantModel } from "@/models/Participant";

export const PARTICIPANT_COOKIE = "icpex_participant";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionToken = {
  participantId: string;
  exp: number;
};

const sessionTokenSchema = z.object({
  participantId: z.string().min(1),
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

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function seal(token: SessionToken): string {
  const body = Buffer.from(JSON.stringify(token), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function unseal(value: string | undefined): SessionToken | null {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  if (!safeEqual(sign(body), signature)) return null;

  try {
    const parsed = sessionTokenSchema.safeParse(
      JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    );
    if (!parsed.success) return null;
    if (parsed.data.exp < Date.now()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export async function createParticipantSession(participantId: string) {
  const token = seal({
    participantId,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
  const cookieStore = await cookies();
  cookieStore.set(PARTICIPANT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteParticipantSession() {
  const cookieStore = await cookies();
  cookieStore.set(PARTICIPANT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Verified participant for the current request, or null. */
export const getParticipantSession = cache(async () => {
  const cookieStore = await cookies();
  const token = unseal(cookieStore.get(PARTICIPANT_COOKIE)?.value);
  if (!token) return null;

  const participant = await new ParticipantModel().findById(token.participantId);
  if (!participant || !participant.email_verified) return null;
  return participant;
});
