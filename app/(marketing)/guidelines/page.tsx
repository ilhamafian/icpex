import type { Metadata } from "next";

import {
  AWARDS,
  FULL_PAPER_CRITERIA,
  PG_LIVE_CRITERIA,
  PG_POSTER_CRITERIA,
  UG_ABSTRACT_CRITERIA,
  UG_VIDEO_CRITERIA,
} from "@/components/marketing/content";
import { LiquidGlass } from "@/components/ui/liquid-glass";

export const metadata: Metadata = {
  title: "Guidelines & Awards",
  description:
    "Judging criteria and awards for the undergraduate innovation project and postgraduate Five-Minute Thesis competitions.",
};

const GLASS_CLASS =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";
const GLASS_STYLE = { backgroundColor: "rgb(14 32 56 / 0.82)" };

const CRITERIA = [
  {
    title: "Undergraduate Innovation Project Competition",
    panels: [
      { title: "Video presentation", items: UG_VIDEO_CRITERIA },
      { title: "Abstract", items: UG_ABSTRACT_CRITERIA },
      { title: "Full paper (optional)", items: FULL_PAPER_CRITERIA },
    ],
  },
  {
    title: "Postgraduate Five-Minute Thesis (5MT)",
    panels: [
      { title: "Research poster", items: PG_POSTER_CRITERIA },
      { title: "Live presentation (5MT)", items: PG_LIVE_CRITERIA },
      { title: "Full paper (optional)", items: FULL_PAPER_CRITERIA },
    ],
  },
] as const;

function splitInHalf<T>(items: readonly T[]) {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

function CriteriaCard({ title, items }: { title: string; items: readonly string[] }) {
  const columns = splitInHalf(items);

  return (
    <LiquidGlass
      tint={0}
      radius={28}
      className={GLASS_CLASS}
      style={GLASS_STYLE}
      contentClassName="px-6 py-8 sm:px-10 sm:py-9"
    >
      <h3 className="text-center text-sm font-bold tracking-[0.14em] text-[#e8b84a] uppercase">
        {title}
      </h3>
      <div className="mt-6 grid gap-x-14 gap-y-2.5 sm:grid-cols-2">
        {columns.map((column) => (
          <ul
            key={column[0]}
            className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-white/90 sm:text-base"
          >
            {column.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ))}
      </div>
    </LiquidGlass>
  );
}

export default function GuidelinesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-16">
      <h1 className="sr-only">Guidelines & Awards</h1>
      <div className="flex flex-col gap-16">
        {CRITERIA.map((group) => (
          <section key={group.title}>
            <p className="text-center text-xs font-semibold tracking-[0.16em] text-[#e8b84a] uppercase">
              Judging criteria
            </p>
            <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {group.title}
            </h2>
            <div className="mx-auto mt-4 h-px max-w-5xl bg-[#e8b84a]" />
            <div className="mt-10 flex flex-col gap-5">
              {group.panels.map((panel) => (
                <CriteriaCard key={panel.title} title={panel.title} items={panel.items} />
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Awards</h2>
          <div className="mx-auto mt-4 h-px max-w-5xl bg-[#e8b84a]" />
          <LiquidGlass
            tint={0}
            radius={28}
            className={`mt-10 ${GLASS_CLASS}`}
            style={GLASS_STYLE}
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
        </section>
      </div>
    </div>
  );
}
