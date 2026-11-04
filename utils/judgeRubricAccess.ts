import "server-only";

import type { EducationLevel } from "@/schemas/educationLevel";
import { educationLevelSchema } from "@/schemas/educationLevel";
import type { UserRole } from "@/schemas/userRole";
import { educationLevelForRole } from "@/schemas/userRole";

export function resolveRubricTrack(
  role: UserRole,
  requested: unknown
):
  | { ok: true; level: EducationLevel }
  | { ok: false; error: string; status: number } {
  const own = educationLevelForRole(role);
  if (own) return { ok: true, level: own };

  const parsed = educationLevelSchema.safeParse(requested);
  if (!parsed.success) {
    return { ok: false, error: "Choose an education track.", status: 400 };
  }
  return { ok: true, level: parsed.data };
}
