import {
  JudgeAssignment,
  judgeAssignmentsSchema,
} from "@/schemas/judgeAssignmentsSchema";
import { ZodSchema } from "zod";
import { ModelBase } from "./ModelBase";

export class JudgeAssignmentModel extends ModelBase<JudgeAssignment> {
  protected collectionName = "judge_assignments";
  protected schema: ZodSchema<JudgeAssignment> = judgeAssignmentsSchema;

  async clearScores(id: string) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(id), {
      $set: {
        scores: [],
        total_score: 0,
        updated_at: new Date(),
      },
      $unset: { submitted_at: "" },
    });
  }
}
