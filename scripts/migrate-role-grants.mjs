// Converts users.roles from plain strings (["SECRETARY"]) to competition-scoped
// grants ([{ role: "SECRETARY", competition_id: "<current>" }]). ADMIN stays global.
// Usage: npm run migrate:roles   (reads MONGODB_URI / DB_NAME from .env)
// Idempotent: users whose roles are already grants are left untouched.

import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const dbName = process.env.MONGODB_DATABASE ?? process.env.DB_NAME ?? "test";

  const client = await new MongoClient(uri).connect();
  try {
    const db = client.db(dbName);
    const users = db.collection("users");

    const legacy = await users.find({ roles: { $type: "string" } }).toArray();
    if (legacy.length === 0) {
      console.log("Nothing to migrate: all users already use role grants.");
      return;
    }

    // Same rule as getCurrentCompetition(): latest published by start date.
    const [current] = await db
      .collection("competitions")
      .find({ status: "PUBLISHED" })
      .sort({ start_date: -1 })
      .limit(1)
      .toArray();

    const needsCompetition = legacy.some((user) =>
      user.roles.some((role) => typeof role === "string" && role !== "ADMIN")
    );
    if (needsCompetition && !current) {
      throw new Error(
        "No published competition found. Publish one first so secretary and judge roles can be assigned to it."
      );
    }

    const competitionId = current?._id.toString();
    if (current) {
      console.log(`Assigning staff roles to "${current.name}" (${competitionId}).`);
    }

    let migrated = 0;
    for (const user of legacy) {
      const grants = user.roles.map((role) => {
        if (typeof role !== "string") return role;
        return role === "ADMIN" ? { role } : { role, competition_id: competitionId };
      });

      await users.updateOne(
        { _id: user._id },
        { $set: { roles: grants, updated_at: new Date() } }
      );
      migrated += 1;
    }

    console.log(`Migrated ${migrated} user(s).`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
