import {
  IconClipboardList,
  IconDashboard,
  IconListDetails,
  IconScale,
  IconUserCheck,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";

import type { UserRole } from "@/schemas/userRole";

export type PortalSection =
  | "dashboard"
  | "competitions-categories"
  | "judging-criteria"
  | "judge-assignments"
  | "users"
  | "registrations"
  | "my-assignments";

export type PortalNavItem = {
  title: string;
  url: string;
  icon: Icon;
  section: PortalSection;
  roles: UserRole[];
};

/** Single source of truth for portal sidebar + page titles. */
export const portalNavMain: PortalNavItem[] = [
  {
    title: "Dashboard",
    url: "/portal/dashboard",
    icon: IconDashboard,
    section: "dashboard",
    roles: ["ADMIN"],
  },
  {
    title: "Competitions & Categories",
    url: "/portal/competitions-categories",
    icon: IconListDetails,
    section: "competitions-categories",
    roles: ["ADMIN"],
  },
  {
    title: "Judging Criteria",
    url: "/portal/judging-criteria",
    icon: IconScale,
    section: "judging-criteria",
    roles: ["ADMIN"],
  },
  {
    title: "Judge Assignments",
    url: "/portal/judge-assignments",
    icon: IconUserCheck,
    section: "judge-assignments",
    roles: ["ADMIN"],
  },
  {
    title: "Users",
    url: "/portal/users",
    icon: IconUsers,
    section: "users",
    roles: ["ADMIN"],
  },
  {
    title: "Payments",
    url: "/portal/registrations",
    icon: IconClipboardList,
    section: "registrations",
    roles: ["SECRETARY"],
  },
  {
    title: "My Assignments",
    url: "/portal/my-assignments",
    icon: IconClipboardList,
    section: "my-assignments",
    roles: ["THESIS_JUDGE", "EBOOK_JUDGE"],
  },
];

const titleBySection: Record<PortalSection, string> = {
  dashboard: "Dashboard",
  "competitions-categories": "Competitions & Categories",
  "judging-criteria": "Judging Criteria",
  "judge-assignments": "Judge Assignments",
  users: "Users",
  registrations: "Payments",
  "my-assignments": "My Assignments",
};

export function getNavForRole(role: UserRole): PortalNavItem[] {
  return portalNavMain.filter((item) => item.roles.includes(role));
}

export function getPortalSection(pathname: string): PortalSection {
  if (pathname.startsWith("/portal/competitions-categories")) {
    return "competitions-categories";
  }
  if (pathname.startsWith("/portal/judging-criteria")) {
    return "judging-criteria";
  }
  if (pathname.startsWith("/portal/judge-assignments")) {
    return "judge-assignments";
  }
  if (pathname.startsWith("/portal/users")) {
    return "users";
  }
  if (pathname.startsWith("/portal/registrations")) {
    return "registrations";
  }
  if (pathname.startsWith("/portal/my-assignments")) {
    return "my-assignments";
  }
  return "dashboard";
}

export function getPortalPageTitle(pathname: string): string {
  return titleBySection[getPortalSection(pathname)];
}

export function canAccessSection(
  role: UserRole,
  section: PortalSection
): boolean {
  const item = portalNavMain.find((nav) => nav.section === section);
  return item ? item.roles.includes(role) : false;
}
