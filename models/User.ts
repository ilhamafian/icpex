import { ZodSchema } from "zod";
import { ModelBase } from "@/models/ModelBase";
import { userSchema, User } from "@/schemas/userSchema";

export class UserModel extends ModelBase<User> {
  protected collectionName = "users";
  protected schema: ZodSchema<User> = userSchema;

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.findOne({ email: email.toLowerCase() });
    return result ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.findOne({ username: username.toLowerCase() });
    return result ?? null;
  }
}
