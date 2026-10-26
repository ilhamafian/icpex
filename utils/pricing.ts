import "server-only";

import { RegistrationModel } from "@/models/Registration";
import { FREE_PROJECT_EVERY } from "@/schemas/registrationSchema";
import { normalizeInstitution } from "@/utils/institutionKey";
import {
  feeForInstitution,
  type Currency,
  type ProjectFee,
} from "@/utils/registrationFee";

export { normalizeInstitution };

export type SubmissionQuote = {
  /** Projects this university already has in the competition. */
  priorCount: number;
  currency: Currency;
  /** Fee per project in this submission, in submission order. */
  fees: number[];
  freeCount: number;
  total: number;
};

/** Pure pricing: the Nth project overall (1-based) is free when N % FREE_PROJECT_EVERY === 0. */
export function priceProjects(
  priorCount: number,
  projectCount: number,
  fee: ProjectFee
): SubmissionQuote {
  const fees = Array.from({ length: projectCount }, (_, index): number =>
    (priorCount + index + 1) % FREE_PROJECT_EVERY === 0 ? 0 : fee.amount
  );
  return {
    priorCount,
    currency: fee.currency,
    fees,
    freeCount: fees.filter((amount) => amount === 0).length,
    total: fees.reduce((sum, amount) => sum + amount, 0),
  };
}

export async function quoteSubmission(
  competitionId: string,
  institution: { name: string; country: string },
  projectCount: number
): Promise<SubmissionQuote> {
  const key = normalizeInstitution(institution.name);
  const priorCount = key
    ? await new RegistrationModel().countForInstitution(competitionId, key)
    : 0;
  return priceProjects(priorCount, projectCount, feeForInstitution(institution));
}
