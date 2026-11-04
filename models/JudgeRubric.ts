import { ZodSchema } from "zod";

import {
  JudgeRubric,
  judgeRubricSchema,
} from "@/schemas/judgeRubricSchema";
import { ModelBase } from "./ModelBase";

export class JudgeRubricModel extends ModelBase<JudgeRubric> {
  protected collectionName = "judge_rubrics";
  protected schema: ZodSchema<JudgeRubric> = judgeRubricSchema;
}
