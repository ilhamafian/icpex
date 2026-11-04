import type { CompetitionEligibility } from "@/schemas/educationLevel";
import type { RoleGrant } from "@/schemas/userSchema";
import { userRoleSchema, type UserRole } from "@/schemas/userRole";

const LEGACY_ROLES = new Set([
  "ADMIN",
  "SECRETARY",
  "JUDGE_LEADER",
  "THESIS_JUDGE",
  "JTEC_JUDGE",
]);

function grantRole(grant: unknown): string {
  if (typeof grant === "string") return grant;
  if (grant && typeof grant === "object" && "role" in grant) {
    return String((grant as { role: unknown }).role);
  }
  return "";
}

function grantCompetitionId(grant: unknown): string | undefined {
  if (!grant || typeof grant !== "object" || !("competition_id" in grant)) {
    return undefined;
  }
  const id = (grant as { competition_id?: unknown }).competition_id;
  return typeof id === "string" && id ? id : undefined;
}

export function grantsNeedMigration(roles: unknown): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.some((grant) => LEGACY_ROLES.has(grantRole(grant)));
}

/**
 * Map pre-track grants onto the education-scoped roles.
 * Secretary and judge leader become both tracks. Judges follow the profile
 * level, or both tracks when that level is missing or BOTH.
 */
export function migrateRoleGrants(
  roles: unknown,
  educationEligibility?: CompetitionEligibility | string
): RoleGrant[] {
  if (!Array.isArray(roles)) return [];

  const next: RoleGrant[] = [];
  const seen = new Set<string>();

  function add(role: UserRole, competitionId?: string) {
    if (role !== "SUPER_ADMIN" && !competitionId) return;
    const key = role === "SUPER_ADMIN" ? role : `${role}:${competitionId}`;
    if (seen.has(key)) return;
    seen.add(key);
    next.push(
      role === "SUPER_ADMIN"
        ? { role }
        : { role, competition_id: competitionId }
    );
  }

  function addJudge(competitionId?: string) {
    if (!competitionId) return;
    if (educationEligibility === "POSTGRADUATE") {
      add("POSTGRAD_JUDGE", competitionId);
      return;
    }
    if (educationEligibility === "UNDERGRADUATE") {
      add("UNDERGRAD_JUDGE", competitionId);
      return;
    }
    add("POSTGRAD_JUDGE", competitionId);
    add("UNDERGRAD_JUDGE", competitionId);
  }

  for (const grant of roles) {
    const role = grantRole(grant);
    const competitionId = grantCompetitionId(grant);
    switch (role) {
      case "ADMIN":
      case "SUPER_ADMIN":
        add("SUPER_ADMIN");
        break;
      case "SECRETARY":
        if (competitionId) {
          add("POSTGRAD_SECRETARIAT", competitionId);
          add("UNDERGRAD_SECRETARIAT", competitionId);
        }
        break;
      case "JUDGE_LEADER":
        if (competitionId) {
          add("POSTGRAD_JUDGE_LEADER", competitionId);
          add("UNDERGRAD_JUDGE_LEADER", competitionId);
        }
        break;
      case "THESIS_JUDGE":
      case "JTEC_JUDGE":
        addJudge(competitionId);
        break;
      default:
        if (userRoleSchema.safeParse(role).success) {
          add(role as UserRole, competitionId);
        }
    }
  }

  return next;
}
