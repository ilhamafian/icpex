import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { panelThemeStyle } from "@/components/panel-theme";
import { PanelTheme } from "@/components/PanelTheme";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSession } from "@/lib/session";
import { UserModel } from "@/models/User";
import { getHomePathForRole } from "@/utils/portalHome";

export default async function PortalShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/portal/login");
  }

  const account =
    session.source === "env"
      ? null
      : await new UserModel().findByEmail(session.username.toLowerCase());
  const displayName = account?.name?.trim() || session.username;
  const displayEmail =
    account?.email ?? session.role.toLowerCase().replace(/_/g, " ");

  return (
    <TooltipProvider>
      <div className="min-h-full bg-[#0e243c] text-[#10243c]">
        <PanelTheme />
        <SidebarProvider style={panelThemeStyle}>
          <AppSidebar
            variant="inset"
            role={session.role}
            homeHref={getHomePathForRole(session.role)}
            user={{
              name: displayName,
              email: displayEmail,
              avatar: "",
            }}
          />
          <SidebarInset>
            <SiteHeader role={session.role} />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  {children}
                </div>
              </div>
            </div>
          </SidebarInset>
          <RoleSwitcher role={session.role} roles={session.roles} />
        </SidebarProvider>
      </div>
    </TooltipProvider>
  );
}
