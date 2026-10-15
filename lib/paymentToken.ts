import "server-only";

import { createHash, randomBytes } from "crypto";

export function hashPaymentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The raw token is stored on the submission so a resend can reuse the same link. */
export function createPaymentToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPaymentToken(token) };
}
