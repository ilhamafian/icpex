import { WithId } from "mongodb";
import { ZodSchema } from "zod";

import {
  CoOrganiser,
  coOrganiserOrderSchema,
  coOrganiserSchema,
} from "@/schemas/coOrganiserSchema";
import { toIdString } from "@/schemas/objectId";

import { ModelBase } from "./ModelBase";

export class CoOrganiserModel extends ModelBase<CoOrganiser> {
  protected collectionName = "co_organisers";
  protected schema: ZodSchema<CoOrganiser> = coOrganiserSchema;

  async list(): Promise<WithId<CoOrganiser>[]> {
    return this.find({}, { sort: { order: 1, created_at: 1 } });
  }

  async nextOrder(): Promise<number> {
    const [latest] = await this.find({}, { sort: { order: -1 }, limit: 1 });
    return latest ? latest.order + 1 : 0;
  }

  async move(
    id: string,
    direction: "earlier" | "later"
  ): Promise<WithId<CoOrganiser>[] | null> {
    const items = await this.list();
    const index = items.findIndex((item) => toIdString(item._id) === id);
    if (index < 0) return null;

    const target = direction === "earlier" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return items;

    const next = items.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);

    await Promise.all(
      next.map((entry, order) =>
        this.update(toIdString(entry._id), { order }, coOrganiserOrderSchema)
      )
    );
    return this.list();
  }
}
