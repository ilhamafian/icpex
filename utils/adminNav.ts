import {
  IconDashboard,
  IconListDetails,
  type Icon,
} from "@tabler/icons-react";

export type AdminSection = "dashboard" | "competitions-categories";

export type AdminNavItem = {
  title: string;
  url: string;
  icon: Icon;
  section: AdminSection;
};

/** Single source of truth for admin sidebar + page titles. */
export const adminNavMain: AdminNavItem[] = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: IconDashboard,
    section: "dashboard",
  },
  {
    title: "Competitions & Categories",
    url: "/admin/competitions-categories",
    icon: IconListDetails,
    section: "competitions-categories",
  },
];

const titleBySection: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  "competitions-categories": "Competitions & Categories",
};

export function getAdminSection(pathname: string): AdminSection {
  if (pathname.startsWith("/admin/competitions-categories")) {
    return "competitions-categories";
  }
  return "dashboard";
}

export function getAdminPageTitle(pathname: string): string {
  return titleBySection[getAdminSection(pathname)];
}
