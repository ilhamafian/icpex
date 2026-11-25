import type { Metadata } from "next";

import { ContentPage, cardGlassClass, cardGlassStyle } from "@/components/marketing/blocks";
import { AWARDS } from "@/components/marketing/content";
import { LiquidGlass } from "@/components/ui/liquid-glass";

export const metadata: Metadata = {
  title: "Awards",
  description:
    "Cash awards for the undergraduate innovation project and postgraduate Five-Minute Thesis competitions.",
};

export default function AwardsPage() {
  return (
    <ContentPage eyebrow="Recognition" title="Awards">
      <p className="max-w-3xl text-base leading-relaxed text-white/85 sm:text-lg">
        All cash prizes are awarded in Malaysian Ringgit (MYR).
      </p>
      <LiquidGlass
        tint={0}
        radius={28}
        className={`mt-10 ${cardGlassClass}`}
        style={cardGlassStyle}
        contentClassName="grid md:grid-cols-3"
      >
        {AWARDS.map((award, index) => (
          <div
            key={award.amount}
            className={`flex min-h-36 flex-col items-center justify-center px-6 py-8 text-center ${
              index > 0 ? "border-t border-white/10 md:border-t-0 md:border-l" : ""
            }`}
          >
            <p className="text-3xl font-bold text-[#e8b84a]">{award.amount}</p>
            <ul className="mt-3 space-y-1 leading-relaxed text-white/90">
              {award.titles.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ))}
      </LiquidGlass>
    </ContentPage>
  );
}
