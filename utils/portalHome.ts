import type { UserRole } from "@/schemas/userRole";

/** Post-login / role home path for each staff role. */
export function getHomePathForRole(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/portal/dashboard";
    case "SECRETARY":
      return "/portal/registrations";
    case "THESIS_JUDGE":
    case "EBOOK_JUDGE":
      return "/portal/my-assignments";
    default:
      return "/portal/login";
  }
}
