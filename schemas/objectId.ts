import { ObjectId } from "mongodb";
import { z } from "zod";

export const objectIdSchema = z.union([
  z.instanceof(ObjectId),
  z
    .string()
    .refine((id) => ObjectId.isValid(id), { message: "Invalid ObjectId" }),
]);

export function toIdString(
  id: z.infer<typeof objectIdSchema> | undefined
): string {
  if (!id) return "";
  return typeof id === "string" ? id : id.toHexString();
}
