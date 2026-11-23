import { z } from "zod";

export const scoringAudienceSchema = z.enum(["JUDGE", "PAPER_REVIEWER"]);

export type ScoringAudience = z.infer<typeof scoringAudienceSchema>;

export const SCORING_AUDIENCE_LABELS: Record<ScoringAudience, string> = {
  JUDGE: "Judge",
  PAPER_REVIEWER: "Paper Reviewer",
};

/** Missing and unknown values stay in the original judge pool. */
export function scoringAudienceOf(value: unknown): ScoringAudience {
  return value === "PAPER_REVIEWER" ? "PAPER_REVIEWER" : "JUDGE";
}

/**
 * Mongo filter that treats rows saved before audiences existed as judges.
 * Combined with the rest of the query using $and.
 */
export function withScoringAudience(
  filter: Record<string, unknown>,
  audience: ScoringAudience
): Record<string, unknown> {
  const audienceFilter =
    audience === "PAPER_REVIEWER"
      ? { audience: "PAPER_REVIEWER" }
      : {
          $or: [
            { audience: "JUDGE" },
            { audience: { $exists: false } },
            { audience: null },
          ],
        };
  return { $and: [filter, audienceFilter] };
}
