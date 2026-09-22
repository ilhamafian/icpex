import { z } from "zod";

export const userRoleSchema = z.enum([
  "ADMIN",
  "SECRETARY",
  "THESIS_JUDGE",
  "EBOOK_JUDGE",
]);

export type UserRole = z.infer<typeof userRoleSchema>;
