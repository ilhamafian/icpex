import Link from "next/link";

import { LiquidGlass } from "@/components/ui/liquid-glass";

const GLASS_SHADOW =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";

export function SiteFooterBar() {
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 py-3 text-center text-xs text-white/55 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-6 md:text-left">
        <p>© 2027 I-CRIVE · Universiti Kuala Lumpur MIIT. All rights reserved.</p>
        <p className="text-white/70 md:text-center">
          Made with <span aria-hidden="true">❤️</span>
          <span className="sr-only">love</span> by Lofy
        </p>
        <div className="md:justify-self-end">
          <Link href="/portal/login" className="inline-flex rounded-full">
            <LiquidGlass
              tint={0.2}
              className={`${GLASS_SHADOW} text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100`}
              contentClassName="flex items-center justify-center px-4 py-1.5 text-xs font-semibold tracking-wide [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]"
            >
              Staff login
            </LiquidGlass>
          </Link>
        </div>
      </div>
    </footer>
  );
}
