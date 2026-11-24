import type { ReactNode } from "react";

import { RingField } from "@/components/ring-field";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="dark relative flex min-h-full flex-1 flex-col text-white">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <RingField
          className="h-full min-h-full"
          backgroundColor="#07111d"
          colors={["#9ec8e0", "#f0d078"]}
          centerX={0.62}
          scale={1.2}
          glow={1.05}
          intensity={1.45}
          particleSize={1.7}
          sparkle={0.16}
          interactive={false}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07111d] from-8% via-[#07111d]/72 via-36% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07111d]/20 via-transparent to-[#07111d]/70" />
      </div>
      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        <SiteHeader />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
