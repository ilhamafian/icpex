import { createHash, randomBytes } from "crypto";

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24;
const RESET_TTL_MS = 1000 * 60 * 60;

export function createParticipantToken(ttlMs: number) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashParticipantToken(token),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}

export function hashParticipantToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createVerificationToken() {
  return createParticipantToken(VERIFY_TTL_MS);
}

export function createPasswordResetToken() {
  return createParticipantToken(RESET_TTL_MS);
}
