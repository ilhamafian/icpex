import type { ReactNode } from "react";

import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ScrollRingField } from "@/components/marketing/ScrollRingField";
import { SiteFooterBar } from "@/components/marketing/SiteFooterBar";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="dark relative flex min-h-dvh flex-1 flex-col text-white">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <ScrollRingField />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07111d] from-8% via-[#07111d]/72 via-36% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07111d]/20 via-transparent to-[#07111d]/70" />
      </div>
      <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
        <MarketingHeader />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooterBar />
      </div>
    </div>
  );
}
