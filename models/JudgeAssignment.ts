import { Filter } from "mongodb";
import { ZodSchema } from "zod";

import {
  JudgeAssignment,
  judgeAssignmentsSchema,
} from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";
import { ModelBase } from "./ModelBase";

function timestamp(value: Date | string | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export class JudgeAssignmentModel extends ModelBase<JudgeAssignment> {
  protected collectionName = "judge_assignments";
  protected schema: ZodSchema<JudgeAssignment> = judgeAssignmentsSchema;

  /**
   * A judge used to be assigned twice to one registration (Thesis and JTEC).
   * Keep the row that was submitted, otherwise the one with scores.
   */
  async collapseDuplicates() {
    const rows = await this.find({});
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = `${toIdString(row.judge_id)}:${row.registration_number}`;
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }

    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const ranked = [...list].sort((a, b) => {
        const submitted = timestamp(b.submitted_at) - timestamp(a.submitted_at);
        if (submitted !== 0) return submitted;
        const scores = (b.scores?.length ?? 0) - (a.scores?.length ?? 0);
        if (scores !== 0) return scores;
        return timestamp(b.updated_at) - timestamp(a.updated_at);
      });
      for (const extra of ranked.slice(1)) {
        await this.delete(toIdString(extra._id));
      }
    }
  }

  async submittedComponentIds(ids: string[]) {
    const found = new Set<string>();
    if (ids.length === 0) return found;
    const wanted = new Set(ids);
    const rows = await this.find({
      "scores.component_id": { $in: ids },
    } as Filter<JudgeAssignment>);
    for (const row of rows) {
      if (!row.submitted_at) continue;
      for (const score of row.scores ?? []) {
        const id = toIdString(score.component_id);
        if (wanted.has(id)) found.add(id);
      }
    }
    return found;
  }

  /** Pending assignments are accepted in place. Rejected rows are left alone. */
  async acceptPending() {
    const collection = await this.getCollection();
    return collection.updateMany(
      { status: "PENDING" },
      { $set: { status: "ACCEPTED", updated_at: new Date() } }
    );
  }

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
