import { z } from "zod";

/** 24-char hex — same shape clients send and ObjectId.toHexString() returns. */
const OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/;

type ObjectIdLike = { toHexString(): string };

function isObjectIdLike(value: unknown): value is ObjectIdLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "toHexString" in value &&
    typeof (value as ObjectIdLike).toHexString === "function"
  );
}

/**
 * Browser-safe ObjectId check (no `mongodb` import — that package uses Node APIs
 * like `child_process` and breaks client bundles).
 */
export const objectIdSchema = z.custom<string | ObjectIdLike>(
  (val) => {
    if (typeof val === "string") return OBJECT_ID_HEX.test(val);
    if (isObjectIdLike(val)) return OBJECT_ID_HEX.test(val.toHexString());
    return false;
  },
  { message: "Invalid ObjectId" }
);

export function toIdString(
  id: z.infer<typeof objectIdSchema> | undefined
): string {
  if (!id) return "";
  return typeof id === "string" ? id : id.toHexString();
}
