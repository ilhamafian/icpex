import z from "zod";
import { objectIdSchema } from "./objectId";

export const judgeAssignmentStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
]);

export const judgeAssignmentTypeSchema = z.enum(["EBOOK", "THESIS"]);

export const judgeScoreSchema = z.object({
  criteria_id: objectIdSchema,
  score: z.number(),
  comments: z.string(),
});

export const judgeAssignmentsSchema = z.object({
  _id: objectIdSchema.optional(),
  judge_id: objectIdSchema,
  registration_number: z.string().min(1),
  status: judgeAssignmentStatusSchema,
  scores: z.array(judgeScoreSchema).default([]),
  type: judgeAssignmentTypeSchema,
  total_score: z.number().default(0),
  submitted_at: z.coerce.date().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

/** Admin create payload — scores / totals are set when a judge submits. */
export const judgeAssignmentInputSchema = z.object({
  judge_id: objectIdSchema,
  registration_number: z.string().min(1),
  type: judgeAssignmentTypeSchema,
  status: judgeAssignmentStatusSchema.optional(),
});

/** Admin may reassign judge, registration, type, or status — not scores. */
export const judgeAssignmentUpdateSchema = judgeAssignmentInputSchema.partial();

/** Judge accepts or declines a pending assignment. */
export const judgeAssignmentJudgeStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

/** Judge submits / updates scores for an accepted assignment. */
export const judgeAssignmentScoreSubmitSchema = z.object({
  scores: z
    .array(
      judgeScoreSchema.extend({
        score: z.number().min(0).max(100),
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
