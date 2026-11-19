import Image from "next/image";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col text-white">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <Image
          src="/brand/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[78%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07111d] from-10% via-[#07111d]/88 via-48% to-[#07111d]/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07111d]/15 via-transparent to-[#07111d]/75" />
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
