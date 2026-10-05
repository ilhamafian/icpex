import { WithId } from "mongodb";
import { ZodSchema } from "zod";

import { Banner, bannerSchema, type BannerInput } from "@/schemas/bannerSchema";
import { ModelBase } from "./ModelBase";

export class BannerModel extends ModelBase<Banner> {
  protected collectionName = "banners";
  protected schema: ZodSchema<Banner> = bannerSchema;

  async findByCompetition(competitionId: string): Promise<WithId<Banner> | null> {
    return this.findOne({ competition_id: competitionId });
  }

  async upsertForCompetition(
    competitionId: string,
    input: BannerInput
  ): Promise<WithId<Banner>> {
    const existing = await this.findByCompetition(competitionId);
    if (!existing) {
      return this.create({ ...input, competition_id: competitionId });
    }

    await this.update(String(existing._id), {
      ...input,
      competition_id: competitionId,
    });
    return (await this.findByCompetition(competitionId))!;
  }
}
