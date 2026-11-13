// Rewrites REG-YYYY-NNNN to a category code, e.g. IOT-YYYY-NNNN.
// Keeps the year and sequence. Updates judge assignments that store the number.

import { MongoClient } from "mongodb";

function categoryRegistrationCode(name) {
  const words = String(name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9.]+/)
    .map((word) => word.replace(/^\.+|\.+$/g, ""))
    .filter((word) => /[A-Za-z]/.test(word));
  if (words.length === 0) return "REG";
  if (words.length === 1) {
    const letters = words[0].replace(/[^A-Za-z]/g, "");
    return letters.slice(0, 3).toUpperCase() || "REG";
  }
  return words.map((word) => word[0]).join("").toUpperCase();
}

function idString(value) {
  if (!value) return "";
  return typeof value === "string" ? value : value.toHexString();
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const dbName = process.env.MONGODB_DATABASE ?? process.env.DB_NAME ?? "test";
  const client = await new MongoClient(uri).connect();
  try {
    const db = client.db(dbName);
    const categories = await db.collection("categories").find({}).toArray();
    const nameById = new Map(
      categories.map((category) => [idString(category._id), category.name])
    );
    const registrations = await db
      .collection("registrations")
      .find({ registration_number: /^[A-Z0-9]+-\d{4}-\d+$/ })
      .toArray();

    let updated = 0;
    for (const registration of registrations) {
      const match = registration.registration_number.match(
        /^[A-Z0-9]+-(\d{4}-\d+)$/
      );
      if (!match) continue;
      const code = categoryRegistrationCode(
        nameById.get(idString(registration.category_id)) ?? ""
      );
      const next = `${code}-${match[1]}`;
      if (next === registration.registration_number) continue;
      const taken = await db.collection("registrations").findOne({
        registration_number: next,
        _id: { $ne: registration._id },
      });
      if (taken) {
        throw new Error(
          `${registration.registration_number} cannot become ${next}; that number is already used.`
        );
      }
      await db.collection("registrations").updateOne(
        { _id: registration._id },
        { $set: { registration_number: next } }
      );
      await db.collection("judge_assignments").updateMany(
        { registration_number: registration.registration_number },
        { $set: { registration_number: next } }
      );
      updated += 1;
      console.log(`${registration.registration_number} -> ${next}`);
    }
    console.log(`Updated ${updated} registration number(s) in ${dbName}.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
