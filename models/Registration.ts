import { Filter } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  Registration,
  registrationSchema,
} from "@/schemas/registrationSchema";
import { categoryRegistrationCode } from "@/utils/categoryCode";

export class RegistrationModel extends ModelBase<Registration> {
  protected collectionName = "registrations";
  protected schema: ZodSchema<Registration> = registrationSchema;

  private static institutionIndexReady: Promise<string> | null = null;

  /** Projects a university already has in a competition, excluding rejected ones. */
  async countForInstitution(
    competitionId: string,
    institutionKey: string
  ): Promise<number> {
    const collection = await this.getCollection();
    RegistrationModel.institutionIndexReady ??= collection
      .createIndex({ competition_id: 1, institution_key: 1 })
      .catch((error) => {
        RegistrationModel.institutionIndexReady = null;
        throw error;
      });
    await RegistrationModel.institutionIndexReady;

    return this.count({
      competition_id: competitionId,
      institution_key: institutionKey,
      status: { $ne: "REJECTED" },
    } as Filter<Registration>);
  }

  /** e.g. IOT-2026-0001 for Internet of Things — unique within the collection. */
  async nextRegistrationNumber(categoryName: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${categoryRegistrationCode(categoryName)}-${year}-`;
    const count = await this.count({
      registration_number: {
        $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      },
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
