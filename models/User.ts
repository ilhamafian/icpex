import type { Filter, UpdateFilter, WithId } from "mongodb";
import { ZodSchema } from "zod";
import { ModelBase } from "@/models/ModelBase";
import type { JudgeProfile } from "@/schemas/judgeProfileSchema";
import {
  roleGrantSchema,
  userSchema,
  type RoleGrant,
  type User,
} from "@/schemas/userSchema";
import {
  grantsNeedMigration,
  migrateRoleGrants,
} from "@/utils/migrateRoleGrants";

const LEGACY_ROLE_NAMES = [
  "ADMIN",
  "SECRETARY",
  "JUDGE_LEADER",
  "THESIS_JUDGE",
  "JTEC_JUDGE",
];

export class UserModel extends ModelBase<User> {
  protected collectionName = "users";
  protected schema: ZodSchema<User> = userSchema;
  private static legacyMigration: Promise<void> | null = null;

  /**
   * Rewrite leftover role grants once per process, before any user is read,
   * so filters for the new roles still find existing staff.
   */
  private async ensureLegacyRolesMigrated() {
    if (!UserModel.legacyMigration) {
      UserModel.legacyMigration = this.rewriteLegacyRoles().catch((error) => {
        UserModel.legacyMigration = null;
        throw error;
      });
    }
    await UserModel.legacyMigration;
  }

  private async rewriteLegacyRoles() {
    const collection = await this.getCollection();
    const docs = await collection
      .find({
        $or: [
          { "roles.role": { $in: LEGACY_ROLE_NAMES } },
          { roles: { $elemMatch: { $in: LEGACY_ROLE_NAMES } } },
        ],
      } as Filter<User>)
      .toArray();

    for (const doc of docs) {
      if (!grantsNeedMigration(doc.roles)) continue;
      const roles = migrateRoleGrants(
        doc.roles,
        doc.judge_profile?.education_eligibility
      );
      if (roles.length === 0) continue;
      await collection.updateOne({ _id: doc._id } as Filter<User>, {
        $set: { roles, updated_at: new Date() },
      });
    }
  }

  override async findById(id: string): Promise<WithId<User> | null> {
    await this.ensureLegacyRolesMigrated();
    return super.findById(id);
  }

  override async findOne(query: Filter<User>): Promise<WithId<User> | null> {
    await this.ensureLegacyRolesMigrated();
    return super.findOne(query);
  }

  override async find(
    query: Filter<User> = {} as Filter<User>,
    options: {
      skip?: number;
      limit?: number;
      sort?: import("mongodb").Sort;
    } = {}
  ): Promise<WithId<User>[]> {
    await this.ensureLegacyRolesMigrated();
    return super.find(query, options);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.findOne({ email: email.toLowerCase() });
    return result ?? null;
  }

  async updateCredentials(
    id: string,
    data: { name?: string; password_hash?: string }
  ) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(id), {
      $set: {
        ...data,
        updated_at: new Date(),
      },
    });
  }

  async findByInviteTokenHash(tokenHash: string): Promise<User | null> {
    const result = await this.findOne({ invite_token_hash: tokenHash });
    return result ?? null;
  }

  async addRole(id: string, grant: RoleGrant) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(id), {
      $addToSet: { roles: roleGrantSchema.parse(grant) },
      $set: { updated_at: new Date() },
    });
  }

  async removeRole(id: string, grant: RoleGrant) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(id), {
      $pull: {
        roles: grant.competition_id
          ? { role: grant.role, competition_id: grant.competition_id }
          : { role: grant.role, competition_id: { $exists: false } },
      },
      $set: { updated_at: new Date() },
    } as UpdateFilter<User>);
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
      name: string;
      judge_profile?: JudgeProfile;
    }
  ) {
    const collection = await this.getCollection();
    const $set: Record<string, unknown> = {
      password_hash: data.password_hash,
      name: data.name,
      status: "ACTIVE",
      email_verified: true,
      updated_at: new Date(),
    };
    if (data.judge_profile) {
      $set.judge_profile = data.judge_profile;
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
