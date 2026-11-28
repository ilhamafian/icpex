import { z } from "zod";

import type {
  CompetitionEligibility,
  EducationLevel,
} from "@/schemas/educationLevel";
import type { ScoringAudience } from "@/schemas/scoringAudience";

export const userRoleSchema = z.enum([
  "SUPER_ADMIN",
  "POSTGRAD_ADMIN",
  "UNDERGRAD_ADMIN",
  "POSTGRAD_SECRETARIAT",
  "UNDERGRAD_SECRETARIAT",
  "POSTGRAD_JUDGE_LEADER",
  "UNDERGRAD_JUDGE_LEADER",
  "REVIEWER_LEADER",
  "POSTGRAD_JUDGE",
  "UNDERGRAD_JUDGE",
  "POSTGRAD_PAPER_REVIEWER",
  "UNDERGRAD_PAPER_REVIEWER",
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
  REVIEWER_LEADER: "Reviewer Leader",
  POSTGRAD_JUDGE: "Postgraduate Judge",
  UNDERGRAD_JUDGE: "Undergraduate Judge",
  POSTGRAD_PAPER_REVIEWER: "Postgraduate Paper Reviewer",
  UNDERGRAD_PAPER_REVIEWER: "Undergraduate Paper Reviewer",
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

/** Judge leaders and super admin. */
export const JUDGE_LEADER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "POSTGRAD_JUDGE_LEADER",
  "UNDERGRAD_JUDGE_LEADER",
];

/** Criteria, assignments, marks, and distribution. */
export const SCORING_LEADER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "POSTGRAD_JUDGE_LEADER",
  "UNDERGRAD_JUDGE_LEADER",
  "REVIEWER_LEADER",
];

/** Scoring judges. Each one scores every judge rubric for their education track. */
export const SCORING_JUDGE_ROLES: UserRole[] = [
  "POSTGRAD_JUDGE",
  "UNDERGRAD_JUDGE",
];

/** Paper reviewers. Each one scores every paper-reviewer rubric for their track. */
export const PAPER_REVIEWER_ROLES: UserRole[] = [
  "POSTGRAD_PAPER_REVIEWER",
  "UNDERGRAD_PAPER_REVIEWER",
];

/** Judges and paper reviewers. Both complete a profile and score assignments. */
export const SCORING_ROLES: UserRole[] = [
  ...SCORING_JUDGE_ROLES,
  ...PAPER_REVIEWER_ROLES,
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

export function isPaperReviewerRole(role: string): role is UserRole {
  return (PAPER_REVIEWER_ROLES as readonly string[]).includes(role);
}

export function isScoringRole(role: string): role is UserRole {
  return isScoringJudgeRole(role) || isPaperReviewerRole(role);
}

/** Audiences this leader may manage. Super admin keeps both. */
export function leaderAudiences(role: UserRole): ScoringAudience[] {
  if (role === "SUPER_ADMIN") return ["JUDGE", "PAPER_REVIEWER"];
  if (role === "REVIEWER_LEADER") return ["PAPER_REVIEWER"];
  if (role.endsWith("_JUDGE_LEADER")) return ["JUDGE"];
  return [];
}

export function judgeRoleForEducation(level: EducationLevel): UserRole {
  return level === "POSTGRADUATE" ? "POSTGRAD_JUDGE" : "UNDERGRAD_JUDGE";
}

export function reviewerRoleForEducation(level: EducationLevel): UserRole {
  return level === "POSTGRADUATE"
    ? "POSTGRAD_PAPER_REVIEWER"
    : "UNDERGRAD_PAPER_REVIEWER";
}

/** Scoring roles for one audience. A null level includes both tracks. */
export function scoringRolesForAudience(
  level: EducationLevel | null,
  audience: ScoringAudience
): UserRole[] {
  if (audience === "PAPER_REVIEWER") {
    return level ? [reviewerRoleForEducation(level)] : [...PAPER_REVIEWER_ROLES];
  }
  return level ? [judgeRoleForEducation(level)] : [...SCORING_JUDGE_ROLES];
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
        "REVIEWER_LEADER",
        "POSTGRAD_JUDGE",
        "POSTGRAD_PAPER_REVIEWER",
      ];
    case "UNDERGRAD_ADMIN":
      return [
        "UNDERGRAD_ADMIN",
        "UNDERGRAD_SECRETARIAT",
        "UNDERGRAD_JUDGE_LEADER",
        "REVIEWER_LEADER",
        "UNDERGRAD_JUDGE",
        "UNDERGRAD_PAPER_REVIEWER",
      ];
    default:
      return [];
  }
}

/**
 * Level stored on a scoring profile. Both tracks only when the invite includes
 * scoring roles from both education tracks. Judges and paper reviewers count.
 */
export function educationEligibilityForJudgeRoles(
  roles: readonly UserRole[]
): CompetitionEligibility | null {
  const postgrad = roles.some(
    (role) => role === "POSTGRAD_JUDGE" || role === "POSTGRAD_PAPER_REVIEWER"
  );
  const undergrad = roles.some(
    (role) => role === "UNDERGRAD_JUDGE" || role === "UNDERGRAD_PAPER_REVIEWER"
  );
  if (postgrad && undergrad) return "BOTH";
  if (postgrad) return "POSTGRADUATE";
  if (undergrad) return "UNDERGRADUATE";
  return null;
}
