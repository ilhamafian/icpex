import z from "zod";
import { objectIdSchema } from "./objectId";

export const judgeAssignmentStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
]);

/** Legacy rows may still store Thesis or JTEC. New assignments omit it. */
export const judgeAssignmentTypeSchema = z.enum(["THESIS", "JTEC"]);

export const judgeScoreSchema = z.object({
  component_id: objectIdSchema.optional(),
  /** Scores saved before rubrics referenced a criterion id. */
  criteria_id: objectIdSchema.optional(),
  score: z.number(),
  weight: z.number().optional(),
  comments: z.string().default(""),
});

export const judgeAssignmentsSchema = z.object({
  _id: objectIdSchema.optional(),
  judge_id: objectIdSchema,
  registration_number: z.string().min(1),
  status: judgeAssignmentStatusSchema,
  scores: z.array(judgeScoreSchema).default([]),
  type: judgeAssignmentTypeSchema.optional(),
  total_score: z.number().default(0),
  submitted_at: z.coerce.date().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

/** Leader create payload — scores / totals are set when a judge submits. */
export const judgeAssignmentInputSchema = z.object({
  judge_id: objectIdSchema,
  registration_number: z.string().min(1),
  status: judgeAssignmentStatusSchema.optional(),
});

/** Leader may reassign judge, registration, or status — not scores. */
export const judgeAssignmentUpdateSchema = judgeAssignmentInputSchema.partial();

/** Judge accepts or declines a pending assignment. */
export const judgeAssignmentJudgeStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

/** Judge submits / updates scores for an accepted assignment. */
export const judgeAssignmentScoreSubmitSchema = z.object({
  scores: z
    .array(
      z.object({
        component_id: objectIdSchema,
        score: z.number().int().min(1).max(10),
        comments: z.string().default(""),
      })
    )
    .min(1),
});

export type JudgeAssignment = z.infer<typeof judgeAssignmentsSchema>;
export type JudgeAssignmentInput = z.infer<typeof judgeAssignmentInputSchema>;
export type JudgeAssignmentStatus = z.infer<typeof judgeAssignmentStatusSchema>;
export type JudgeAssignmentType = z.infer<typeof judgeAssignmentTypeSchema>;
export type JudgeScore = z.infer<typeof judgeScoreSchema>;
export type JudgeAssignmentJudgeStatus = z.infer<
  typeof judgeAssignmentJudgeStatusSchema
>;
export type JudgeAssignmentScoreSubmit = z.infer<
  typeof judgeAssignmentScoreSubmitSchema
>;
