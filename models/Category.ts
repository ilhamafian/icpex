import { Category, categorySchema } from "@/schemas/categorySchema";
import { ZodSchema } from "zod";
import { ModelBase } from "./ModelBase";

export class CategoryModel extends ModelBase<Category> {
    protected collectionName = "categories";
    protected schema: ZodSchema<Category> = categorySchema;

    async getCategories(): Promise<Category[] | null> {
        const result = await this.find({});
        return result ? result: null;
    }
}