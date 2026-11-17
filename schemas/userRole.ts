import { z } from "zod";

import type {
  CompetitionEligibility,
  EducationLevel,
} from "@/schemas/educationLevel";

export const userRoleSchema = z.enum([
  "SUPER_ADMIN",
  "POSTGRAD_ADMIN",
  "UNDERGRAD_ADMIN",
  "POSTGRAD_SECRETARIAT",
  "UNDERGRAD_SECRETARIAT",
  "POSTGRAD_JUDGE_LEADER",
  "UNDERGRAD_JUDGE_LEADER",
  "POSTGRAD_JUDGE",
  "UNDERGRAD_JUDGE",
]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  POSTGRAD_ADMIN: "Postgraduate Admin",
  UNDERGRAD_ADMIN: "Undergraduate Admin",
  POSTGRAD_SECRETARIAT: "Postgraduate Secretariat",
  UNDERGRAD_SECRETARIAT: "Undergraduate Secretariat",
  POSTGRAD_JUDGE_LEADER: "Postgraduate Judge Leader",
  UNDERGRAD_JUDGE_LEADER: "Undergraduate Judge Leader",
  POSTGRAD_JUDGE: "Postgraduate Judge",
  UNDERGRAD_JUDGE: "Undergraduate Judge",
};

/** Staff who manage competitions, users, and the dashboard. */
export const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "POSTGRAD_ADMIN",
  "UNDERGRAD_ADMIN",
];

/** Payment review. Super admin sees both tracks. */
export const SECRETARIAT_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "POSTGRAD_SECRETARIAT",
  "UNDERGRAD_SECRETARIAT",
];

/** Judging criteria and assignments. Super admin sees both tracks. */
export const JUDGE_LEADER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "POSTGRAD_JUDGE_LEADER",
  "UNDERGRAD_JUDGE_LEADER",
];

/** Scoring judges. Each one scores every rubric for their education track. */
export const SCORING_JUDGE_ROLES: UserRole[] = [
  "POSTGRAD_JUDGE",
  "UNDERGRAD_JUDGE",
];

/** Roles in display / default-selection priority order. */
export function sortRoles(roles: readonly UserRole[]): UserRole[] {
  return userRoleSchema.options.filter((role) => roles.includes(role));
}

/** Education track baked into a role. Super admin is unscoped. */
export function educationLevelForRole(role: UserRole): EducationLevel | null {
  if (role.startsWith("POSTGRAD_")) return "POSTGRADUATE";
  if (role.startsWith("UNDERGRAD_")) return "UNDERGRADUATE";
  return null;
}

export function isGlobalRole(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

/** Postgraduate judge leader and super admin nominate 5MT live presenters. */
export function canManageLivePresentation(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "POSTGRAD_JUDGE_LEADER";
}

export function isScoringJudgeRole(role: string): role is UserRole {
  return (SCORING_JUDGE_ROLES as readonly string[]).includes(role);
}

export function judgeRoleForEducation(level: EducationLevel): UserRole {
  return level === "POSTGRADUATE" ? "POSTGRAD_JUDGE" : "UNDERGRAD_JUDGE";
}

/** Roles the active user is allowed to grant. */
export function rolesGrantableBy(actor: UserRole): UserRole[] {
  switch (actor) {
    case "SUPER_ADMIN":
      return [...userRoleSchema.options];
    case "POSTGRAD_ADMIN":
      return [
        "POSTGRAD_ADMIN",
        "POSTGRAD_SECRETARIAT",
        "POSTGRAD_JUDGE_LEADER",
        "POSTGRAD_JUDGE",
      ];
    case "UNDERGRAD_ADMIN":
      return [
        "UNDERGRAD_ADMIN",
        "UNDERGRAD_SECRETARIAT",
        "UNDERGRAD_JUDGE_LEADER",
        "UNDERGRAD_JUDGE",
      ];
    default:
      return [];
  }
}

/**
 * Level stored on a judge profile. Both tracks only when the invite includes
 * both judge roles.
 */
export function educationEligibilityForJudgeRoles(
  roles: readonly UserRole[]
): CompetitionEligibility | null {
  const postgrad = roles.includes("POSTGRAD_JUDGE");
  const undergrad = roles.includes("UNDERGRAD_JUDGE");
  if (postgrad && undergrad) return "BOTH";
  if (postgrad) return "POSTGRADUATE";
  if (undergrad) return "UNDERGRADUATE";
  return null;
}
