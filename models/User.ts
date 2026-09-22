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

  async findByInviteTokenHash(tokenHash: string): Promise<User | null> {
    const result = await this.findOne({ invite_token_hash: tokenHash });
    return result ?? null;
  }

  async setInviteToken(
    id: string,
    data: { invite_token_hash: string; invite_expires_at: Date }
  ) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(id), {
      $set: {
        invite_token_hash: data.invite_token_hash,
        invite_expires_at: data.invite_expires_at,
        updated_at: new Date(),
      },
    });
  }

  async activateFromInvite(
    id: string,
    data: {
      password_hash: string;
      name?: string;
    }
  ) {
    const collection = await this.getCollection();
    const $set: Record<string, unknown> = {
      password_hash: data.password_hash,
      status: "ACTIVE",
      email_verified: true,
      updated_at: new Date(),
    };
    if (data.name) {
      $set.name = data.name;
    }

    return collection.updateOne(this.buildIdFilter(id), {
      $set,
      $unset: {
        invite_token_hash: "",
        invite_expires_at: "",
      },
    });
  }
}
