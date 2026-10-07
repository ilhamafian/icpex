import "server-only";

import { RegistrationModel } from "@/models/Registration";
import { FREE_PROJECT_EVERY } from "@/schemas/registrationSchema";
import { REGISTRATION_FEE } from "@/utils/registrationFee";

export type SubmissionQuote = {
  /** Projects this university already has in the competition. */
  priorCount: number;
  /** Fee per project in this submission, in submission order. */
  fees: number[];
  freeCount: number;
  total: number;
};

/**
 * Matching key for free-text university names: lowercase, punctuation
 * removed, whitespace collapsed. "Universiti Malaya." → "universiti malaya".
 */
export function normalizeInstitution(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pure pricing: the Nth project overall (1-based) is free when N % FREE_PROJECT_EVERY === 0. */
export function priceProjects(
  priorCount: number,
  projectCount: number
): SubmissionQuote {
  const fees = Array.from({ length: projectCount }, (_, index): number =>
    (priorCount + index + 1) % FREE_PROJECT_EVERY === 0 ? 0 : REGISTRATION_FEE
  );
  return {
    priorCount,
    fees,
    freeCount: fees.filter((fee) => fee === 0).length,
    total: fees.reduce((sum, fee) => sum + fee, 0),
  };
}

export async function quoteSubmission(
  competitionId: string,
  institutionName: string,
  projectCount: number
): Promise<SubmissionQuote> {
  const key = normalizeInstitution(institutionName);
  const priorCount = key
    ? await new RegistrationModel().countForInstitution(competitionId, key)
    : 0;
  return priceProjects(priorCount, projectCount);
}
