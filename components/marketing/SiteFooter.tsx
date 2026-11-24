import Image from "next/image";
import Link from "next/link";

import { LiquidGlass } from "@/components/ui/liquid-glass";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Organised by • Publication • Co-Organisers
        </h2>
        <div className="mt-12 grid items-start gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#e8b84a]">Organised by</p>
            <Image
              src="/brand/unikl-logo.png"
              alt="Universiti Kuala Lumpur"
              width={473}
              height={295}
              className="mt-6 h-24 w-auto sm:h-28"
            />
            <p className="mt-4 max-w-sm text-sm text-white/70">
              Research & Innovation Section, Universiti Kuala Lumpur Malaysian Institute of
              Information Technology.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#e8b84a]">
              Publication opportunities
            </p>
            <LiquidGlass
              tint={0}
              radius={28}
              className="mt-6 max-w-md shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]"
              style={{ backgroundColor: "rgb(27 122 67 / 0.72)" }}
              contentClassName="px-6 py-5 text-white"
            >
              <p className="text-2xl leading-tight font-semibold">
                Journal of Computing Technologies and Creative Content
              </p>
              <p className="mt-3 text-sm">e-ISSN : 2550-1550</p>
            </LiquidGlass>
          </div>
        </div>
        <div className="mt-12 text-center">
          <p className="text-sm font-bold tracking-[0.16em] text-[#e8b84a]">Co-organisers</p>
          <p className="mt-3 text-sm text-white/70">To be announced</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-4 text-xs text-white/60 sm:flex-row">
          <p>© 2027 I-CRIVE | Universiti Kuala Lumpur MIIT. All rights reserved.</p>
          <Link href="/portal/login" className="transition-colors hover:text-white">
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
