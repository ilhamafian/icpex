import { Filter } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { Submission, submissionSchema } from "@/schemas/submissionSchema";

export class SubmissionModel extends ModelBase<Submission> {
  protected collectionName = "submissions";
  protected schema: ZodSchema<Submission> = submissionSchema;

  /** e.g. SUB-2026-0001 — unique within the collection. */
  async nextSubmissionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SUB-${year}-`;
    const count = await this.count({
      submission_number: { $regex: `^${prefix}` },
    } as Filter<Submission>);
    let suffix = count + 1;

    while (true) {
      const candidate = `${prefix}${String(suffix).padStart(4, "0")}`;
      const existing = await this.findOne({ submission_number: candidate });
      if (!existing) return candidate;
      suffix += 1;
    }
  }
}
