import { Competition, competitionSchema } from "@/schemas/competitionSchema";
import { ModelBase } from "./ModelBase";
import { ZodSchema } from "zod";

export class CompetitionModel extends ModelBase<Competition> {
    protected collectionName = "competitions";
    protected schema: ZodSchema<Competition> = competitionSchema;

    async getValidCompetitions(): Promise<Competition[] | null> {
        const result = await this.find({ status: "PUBLISHED" });
        return result ? result: null;
    }
}