import type { Filter, WithId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  participantSchema,
  type Participant,
} from "@/schemas/participantSchema";

export class ParticipantModel extends ModelBase<Participant> {
  protected collectionName = "participants";
  protected schema: ZodSchema<Participant> = participantSchema;
  private static emailIndexReady: Promise<string> | null = null;

  private async ensureEmailIndex() {
    const collection = await this.getCollection();
    ParticipantModel.emailIndexReady ??= collection
      .createIndex({ email: 1 }, { unique: true })
      .catch((error) => {
        ParticipantModel.emailIndexReady = null;
        throw error;
      });
    await ParticipantModel.emailIndexReady;
  }

  override async create(data: Participant): Promise<WithId<Participant>> {
    await this.ensureEmailIndex();
    return super.create(data);
  }

  async findByEmail(email: string): Promise<WithId<Participant> | null> {
    await this.ensureEmailIndex();
    return this.findOne({
      email: email.trim().toLowerCase(),
    } as Filter<Participant>);
  }

  async findByVerificationTokenHash(tokenHash: string) {
    return this.findOne({
      verification_token_hash: tokenHash,
    } as Filter<Participant>);
  }

  async findByResetTokenHash(tokenHash: string) {
    return this.findOne({
      reset_token_hash: tokenHash,
    } as Filter<Participant>);
  }

  async setVerificationToken(
    id: string,
    data: { verification_token_hash: string; verification_expires_at: Date }
  ) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(id), {
      $set: { ...data, updated_at: new Date() },
    });
  }

  async markEmailVerified(id: string) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(id), {
      $set: { email_verified: true, updated_at: new Date() },
      $unset: {
        verification_token_hash: "",
        verification_expires_at: "",
      },
    });
  }

  async setResetToken(
    id: string,
    data: { reset_token_hash: string; reset_expires_at: Date }
  ) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(id), {
      $set: { ...data, updated_at: new Date() },
    });
  }

  async updateName(id: string, name: string) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(id), {
      $set: { name, updated_at: new Date() },
    });
  }

  async setPassword(id: string, passwordHash: string) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(id), {
      $set: { password_hash: passwordHash, updated_at: new Date() },
      $unset: { reset_token_hash: "", reset_expires_at: "" },
    });
  }
}
