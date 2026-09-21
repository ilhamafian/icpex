import { Filter } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  Registration,
  registrationSchema,
} from "@/schemas/registrationSchema";

export class RegistrationModel extends ModelBase<Registration> {
  protected collectionName = "registrations";
  protected schema: ZodSchema<Registration> = registrationSchema;

  /** e.g. REG-2026-0001 — unique within the collection. */
  async nextRegistrationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REG-${year}-`;
    const count = await this.count({
      registration_number: { $regex: `^${prefix}` },
    } as Filter<Registration>);
    let suffix = count + 1;

    while (true) {
      const candidate = `${prefix}${String(suffix).padStart(4, "0")}`;
      const existing = await this.findOne({
        registration_number: candidate,
      });
      if (!existing) return candidate;
      suffix += 1;
    }
  }
}
