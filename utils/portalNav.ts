import {
  IconChartBar,
  IconClipboardList,
  IconDashboard,
  IconListDetails,
  IconScale,
  IconUserCheck,
  IconUsers,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";

import {
  ADMIN_ROLES,
  JUDGE_LEADER_ROLES,
  SCORING_ROLES,
  SECRETARIAT_ROLES,
  type UserRole,
} from "@/schemas/userRole";

export type PortalSection =
  | "dashboard"
  | "competitions-categories"
  | "judging-criteria"
  | "judge-assignments"
  | "participant-marks"
  | "judge-distribution"
  | "users"
  | "registrations"
  | "my-assignments"
  | "account";

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
    roles: ADMIN_ROLES,
  },
  {
    title: "Competitions & Categories",
    url: "/portal/competitions-categories",
    icon: IconListDetails,
    section: "competitions-categories",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Judging Criteria",
    url: "/portal/judging-criteria",
    icon: IconScale,
    section: "judging-criteria",
    roles: JUDGE_LEADER_ROLES,
  },
  {
    title: "Judge Assignments",
    url: "/portal/judge-assignments",
    icon: IconUserCheck,
    section: "judge-assignments",
    roles: JUDGE_LEADER_ROLES,
  },
  {
    title: "Participant Marks",
    url: "/portal/participant-marks",
    icon: IconChartBar,
    section: "participant-marks",
    roles: JUDGE_LEADER_ROLES,
  },
  {
    title: "Judge Distribution",
    url: "/portal/judge-distribution",
    icon: IconUsersGroup,
    section: "judge-distribution",
    roles: JUDGE_LEADER_ROLES,
  },
  {
    title: "Users",
    url: "/portal/users",
    icon: IconUsers,
    section: "users",
    roles: ADMIN_ROLES,
  },
  {
    title: "Payments",
    url: "/portal/registrations",
    icon: IconClipboardList,
    section: "registrations",
    roles: SECRETARIAT_ROLES,
  },
  {
    title: "My Assignments",
    url: "/portal/my-assignments",
    icon: IconClipboardList,
    section: "my-assignments",
    roles: SCORING_ROLES,
  },
];

const titleBySection: Record<PortalSection, string> = {
  dashboard: "Dashboard",
  "competitions-categories": "Competitions & Categories",
  "judging-criteria": "Judging Criteria",
  "judge-assignments": "Judge Assignments",
  "participant-marks": "Participant Marks",
  "judge-distribution": "Judge Distribution",
  users: "Users",
  registrations: "Payments",
  "my-assignments": "My Assignments",
  account: "Account",
};

export function getNavForRole(role: UserRole): PortalNavItem[] {
  return portalNavMain.filter((item) => item.roles.includes(role));
}

export function getPortalSection(pathname: string): PortalSection {
  if (pathname.startsWith("/portal/account")) {
    return "account";
  }
  if (pathname.startsWith("/portal/competitions-categories")) {
    return "competitions-categories";
  }
  if (pathname.startsWith("/portal/judging-criteria")) {
    return "judging-criteria";
  }
  if (pathname.startsWith("/portal/judge-assignments")) {
    return "judge-assignments";
  }
  if (pathname.startsWith("/portal/participant-marks")) {
    return "participant-marks";
  }
  if (pathname.startsWith("/portal/judge-distribution")) {
    return "judge-distribution";
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
