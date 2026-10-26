import type { UserRole } from "@/schemas/userRole";

/** Post-login / role home path for each staff role. */
export function getHomePathForRole(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/portal/dashboard";
    case "SECRETARY":
      return "/portal/registrations";
    case "JUDGE_LEADER":
      return "/portal/judging-criteria";
    case "THESIS_JUDGE":
    case "JTEC_JUDGE":
      return "/portal/my-assignments";
    default:
      return "/portal/login";
  }
}
