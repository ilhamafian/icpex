import type { Metadata } from "next";

import { ContentPage } from "@/components/marketing/blocks";
import { LiquidGlass } from "@/components/ui/liquid-glass";

export const metadata: Metadata = {
  title: "Publication Opportunities",
  description: "ISBN abstract book and optional full-paper consideration in JTeC.",
};

export default function PublicationsPage() {
  return (
    <ContentPage eyebrow="Publications / JTeC" title="Publication Opportunities">
      <LiquidGlass
        tint={0}
        radius={28}
        className="mx-auto max-w-3xl shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]"
        style={{ backgroundColor: "rgb(14 32 56 / 0.82)" }}
        contentClassName="px-6 py-8 text-center sm:px-10 sm:py-10"
      >
        <h2 className="text-lg font-bold text-[#e8b84a]">Full Paper (Optional)</h2>
        <p className="mx-auto mt-4 max-w-md text-balance leading-relaxed text-white/80">
          Authors may submit a full paper for possible consideration.
        </p>
        <p className="mt-4 text-balance font-semibold text-white">
          Journal of Computing Technologies and Creative Content
        </p>
        <p className="mt-2 text-sm tracking-wide text-white/70">JTeC · e-ISSN 2550-1550</p>
      </LiquidGlass>
      <p className="mx-auto mt-10 max-w-3xl text-center leading-relaxed text-white/80">
        All manuscripts are subject to editorial screening, peer review and acceptance
        requirements. Submission does not guarantee publication.
      </p>
    </ContentPage>
  );
}
