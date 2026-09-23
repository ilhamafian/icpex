import {
  JudgeAssignment,
  judgeAssignmentsSchema,
} from "@/schemas/judgeAssignmentsSchema";
import { ZodSchema } from "zod";
import { ModelBase } from "./ModelBase";

export class JudgeAssignmentModel extends ModelBase<JudgeAssignment> {
  protected collectionName = "judge_assignments";
  protected schema: ZodSchema<JudgeAssignment> = judgeAssignmentsSchema;
}
