import {
  JudgeCriteria,
  judgeCriteriaSchema,
} from "@/schemas/judgeCriteriaSchema";
import { ZodSchema } from "zod";
import { ModelBase } from "./ModelBase";

export class JudgeCriteriaModel extends ModelBase<JudgeCriteria> {
  protected collectionName = "judge_criteria";
  protected schema: ZodSchema<JudgeCriteria> = judgeCriteriaSchema;
}
