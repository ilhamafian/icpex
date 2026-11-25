import { IconArrowRight, IconClipboardText } from "@tabler/icons-react";
import Link from "next/link";

import { LiquidGlass } from "@/components/ui/liquid-glass";

const GLASS_CLASS =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";

export function CallForJurySection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#e8b84a] uppercase">
            Join the judging panel
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Call for Jury
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-white/85 sm:text-lg">
            <p>
              We invite experienced academics, industry professionals and
              researchers to serve as judges and paper reviewers for{" "}
              <strong className="font-semibold text-white">I-CRIVE 2027</strong>.
            </p>
            <p>
              Your expertise will help evaluate innovative projects and research,
              and provide constructive feedback to participating teams.
            </p>
            <p>Read the rules, then register with the form.</p>
          </div>
        </div>

        <LiquidGlass
          tint={0}
          radius={28}
          className={GLASS_CLASS}
          style={{ backgroundColor: "rgb(14 32 56 / 0.82)" }}
          contentClassName="flex flex-col items-center px-6 py-8 text-center sm:px-8"
        >
          <IconClipboardText className="size-8 text-[#e8b84a]" aria-hidden />
          <h3 className="mt-3 text-lg font-bold text-[#e8b84a]">
            Jury & reviewer registration
          </h3>
          <Link
            href="/call-for-jury"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#d6a11e] px-7 text-sm font-bold tracking-wide text-[#1a1408] transition-colors hover:bg-[#e2b43a]"
          >
            Registration form
            <IconArrowRight className="size-4" aria-hidden />
          </Link>
          <p className="mt-5 text-sm leading-relaxed text-white/75">
            Appointed jury members receive an e-certificate of appreciation.
          </p>
        </LiquidGlass>
      </div>
    </section>
  );
}
