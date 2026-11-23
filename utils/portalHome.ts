import type { UserRole } from "@/schemas/userRole";

/** Post-login / role home path for each staff role. */
export function getHomePathForRole(role: UserRole): string {
  if (role.endsWith("_ADMIN")) return "/portal/dashboard";
  if (role.endsWith("_SECRETARIAT")) return "/portal/registrations";
  if (role.endsWith("_JUDGE_LEADER")) return "/portal/judging-criteria";
  if (role.endsWith("_JUDGE") || role.endsWith("_PAPER_REVIEWER")) {
    return "/portal/my-assignments";
  }
  return "/portal/login";
}
