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
      <div className="dark min-h-full bg-[#07111d] text-white">
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
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
