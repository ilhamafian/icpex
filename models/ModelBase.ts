import {
  Collection,
  Db,
  Filter,
  MongoClient,
  ObjectId,
  OptionalUnlessRequiredId,
  Sort,
  WithId,
} from "mongodb";
import { ZodSchema } from "zod";
import clientPromise from "@/lib/mongodb";

export abstract class ModelBase<T extends Record<string, any>> {
  protected abstract collectionName: string;
  protected abstract schema: ZodSchema<T>;

  private static client: MongoClient;
  private static db: Db;

  static async initialize() {
    if (!ModelBase.client || !ModelBase.db) {
      ModelBase.client = await clientPromise;
      const dbName =
        process.env.MONGODB_DATABASE ?? process.env.DB_NAME ?? "test";
      ModelBase.db = ModelBase.client.db(dbName);
    }
  }

  protected async getCollection(): Promise<Collection<T>> {
    await ModelBase.initialize();
    return ModelBase.db.collection<T>(this.collectionName);
  }

  protected validate(data: Partial<T>): T {
    return this.schema.parse(data);
  }

  /** Users may store `_id` as a string or ObjectId depending on how the doc was created. */
  protected buildIdFilter(id: string): Filter<T> {
    if (ObjectId.isValid(id)) {
      return {
        $or: [{ _id: new ObjectId(id) }, { _id: id }],
      } as Filter<T>;
    }

    return { _id: id } as Filter<T>;
  }

  async findById(id: string): Promise<WithId<T> | null> {
    const collection = await this.getCollection();
    return collection.findOne(this.buildIdFilter(id)) as Promise<WithId<T> | null>;
  }

  async findOne(query: Filter<T>): Promise<WithId<T> | null> {
    const collection = await this.getCollection();
    return collection.findOne(query) as Promise<WithId<T> | null>;
  }

  async find(
    query: Filter<T> = {} as Filter<T>,
    options: {
      skip?: number;
      limit?: number;
      sort?: Sort;
    } = {}
  ): Promise<WithId<T>[]> {
    const collection = await this.getCollection();
    const results = await collection.find(query, options).toArray();
    return results as WithId<T>[];
  }

  async count(query: Filter<T> = {} as Filter<T>): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments(query);
  }

  async create(data: T): Promise<WithId<T>> {
    const now = new Date();
    const validated = this.validate({
      ...(data as any),
      created_at: now,
      updated_at: now,
    });
    const collection = await this.getCollection();
    const result = await collection.insertOne(
      validated as OptionalUnlessRequiredId<T>
    );
    if (!result.insertedId) throw new Error("Failed to insert document");
    return { _id: result.insertedId, ...validated } as WithId<T>;
  }

  async update(
    id: string,
    updateData: Partial<T>,
    schemaOverride?: ZodSchema<Partial<T>>
  ) {
    const schemaToUse = schemaOverride ?? this.schema;
    const validated = schemaToUse.parse(updateData);
    const collection = await this.getCollection();
    return collection.updateOne(
      this.buildIdFilter(id),
      { $set: { ...(validated as any), updated_at: new Date() } } as any
    );
  }

  async delete(id: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteOne(this.buildIdFilter(id));
  }

  async search(
    searchFields: Partial<Record<keyof T, string | number | boolean>>,
    page: number,
    limit: number,
    sortField: string,
    sortOrder: "asc" | "desc"
  ): Promise<{ items: WithId<T>[]; total: number }> {
    const collection = await this.getCollection();

    const query: Filter<T> = {};
    for (const [field, value] of Object.entries(searchFields)) {
      if (typeof value === "string") {
        (query as any)[field] = { $regex: value, $options: "i" };
      } else {
        (query as any)[field] = value;
      }
    }

    const options = {
      skip: (page - 1) * limit,
      limit,
      sort: { [sortField]: sortOrder === "asc" ? 1 : -1 } as Sort,
    };

    const [items, total] = await Promise.all([
      collection.find(query, options).toArray(),
      collection.countDocuments(query),
    ]);

    return { items: items as WithId<T>[], total };
  }
}
