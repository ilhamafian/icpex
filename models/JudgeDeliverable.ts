import { ZodSchema } from "zod";

import {
  JudgeDeliverable,
  judgeDeliverableSchema,
} from "@/schemas/judgeDeliverableSchema";
import type { JudgeCriteriaType } from "@/schemas/judgeCriteriaSchema";
import { toIdString } from "@/schemas/objectId";
import { ModelBase } from "./ModelBase";

export class JudgeDeliverableModel extends ModelBase<JudgeDeliverable> {
  protected collectionName = "judge_deliverables";
  protected schema: ZodSchema<JudgeDeliverable> = judgeDeliverableSchema;

  async saveWeights(
    deliverables: { type: JudgeCriteriaType; weight: number }[]
  ) {
    const saved: Awaited<ReturnType<JudgeDeliverableModel["find"]>> = [];

    for (const item of deliverables) {
      const existing = await this.findOne({ type: item.type });
      if (!existing) {
        saved.push(await this.create(item));
        continue;
      }

      const id = toIdString(existing._id);
      await this.update(id, { type: item.type, weight: item.weight });
      const updated = await this.findById(id);
      if (updated) saved.push(updated);
    }

    return saved;
  }
}
