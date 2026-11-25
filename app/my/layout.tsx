import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";

import { ParticipantHeader } from "@/components/participant-header";
import { ParticipantSidebar } from "@/components/participant-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getParticipantSession } from "@/lib/participantSession";

export default async function ParticipantLayout({ children }: { children: ReactNode }) {
  const session = await getParticipantSession();
  if (!session) redirect("/login");

  return (
    <TooltipProvider>
      <div className="min-h-full bg-[#0e243c] text-[#10243c]">
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
              "--background": "#e7eef5",
              "--foreground": "#10243c",
              "--card": "#ffffff",
              "--card-foreground": "#10243c",
              "--popover": "#ffffff",
              "--popover-foreground": "#10243c",
              "--muted": "#e7eef5",
              "--muted-foreground": "#5c6e82",
              "--accent": "#e7eef5",
              "--accent-foreground": "#10243c",
              "--border": "#d5e1ec",
              "--input": "#ffffff",
              "--sidebar": "#0e243c",
              "--sidebar-foreground": "#ffffff",
              "--sidebar-primary": "#e8b84a",
              "--sidebar-primary-foreground": "#1a1408",
              "--sidebar-accent": "#1a3d62",
              "--sidebar-accent-foreground": "#e8b84a",
              "--sidebar-border": "rgb(255 255 255 / 0.12)",
              "--sidebar-ring": "#e8b84a",
            } as CSSProperties
          }
        >
          <ParticipantSidebar
            variant="inset"
            user={{ name: session.name, email: session.email, avatar: "" }}
          />
          <SidebarInset>
            <ParticipantHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">{children}</div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  );
}
