// Converts E-book judging to JTEC: EBOOK_JUDGE grants become JTEC_JUDGE,
// assignment/criteria type "EBOOK" becomes "JTEC".
// Usage: npm run migrate:ebook-to-jtec   (reads MONGODB_URI / DB_NAME from .env)
// Idempotent: already-converted documents are left untouched.

import { MongoClient } from "mongodb";

function grantKey(grant) {
  const role = grant?.role ?? grant;
  const competitionId = typeof grant === "object" ? (grant.competition_id ?? "") : "";
  return `${role}:${competitionId}`;
}

function toJtecGrant(grant) {
  if (typeof grant === "string") {
    return grant === "EBOOK_JUDGE" ? "JTEC_JUDGE" : grant;
  }
  if (grant?.role === "EBOOK_JUDGE") {
    return { ...grant, role: "JTEC_JUDGE" };
  }
  return grant;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const dbName = process.env.MONGODB_DATABASE ?? process.env.DB_NAME ?? "test";

  const client = await new MongoClient(uri).connect();
  try {
    const db = client.db(dbName);
    const users = db.collection("users");
    const assignments = db.collection("judge_assignments");
    const criteria = db.collection("judge_criteria");

    let usersUpdated = 0;
    const ebookUsers = await users
      .find({
        $or: [
          { "roles.role": "EBOOK_JUDGE" },
          { roles: "EBOOK_JUDGE" },
        ],
      })
      .toArray();

    for (const user of ebookUsers) {
      const seen = new Set();
      const next = [];
      for (const grant of user.roles ?? []) {
        const converted = toJtecGrant(grant);
        const key = grantKey(converted);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(converted);
      }
      await users.updateOne(
        { _id: user._id },
        { $set: { roles: next, updated_at: new Date() } }
      );
      usersUpdated += 1;
    }

    let assignmentsConverted = 0;
    let assignmentsRemoved = 0;
    const ebookAssignments = await assignments.find({ type: "EBOOK" }).toArray();
    for (const assignment of ebookAssignments) {
      const duplicate = await assignments.findOne({
        _id: { $ne: assignment._id },
        judge_id: assignment.judge_id,
        registration_number: assignment.registration_number,
        type: "JTEC",
      });
      if (duplicate) {
        await assignments.deleteOne({ _id: assignment._id });
        assignmentsRemoved += 1;
      } else {
        await assignments.updateOne(
          { _id: assignment._id },
          { $set: { type: "JTEC", updated_at: new Date() } }
        );
        assignmentsConverted += 1;
      }
    }

    const criteriaResult = await criteria.updateMany(
      { type: "EBOOK" },
      { $set: { type: "JTEC", updated_at: new Date() } }
    );

    console.log(
      `Users updated: ${usersUpdated}. Assignments converted: ${assignmentsConverted}, duplicates removed: ${assignmentsRemoved}. Criteria converted: ${criteriaResult.modifiedCount}.`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
