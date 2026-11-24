import { IconArrowRight } from "@tabler/icons-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  cardGlassClass,
  cardGlassStyle,
  GuidelineSection,
  RulesSection,
  TrackList,
} from "@/components/marketing/blocks";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  ABSTRACT_CONTENT,
  ABSTRACT_REQUIREMENTS,
  PAPER_REQUIREMENTS,
  UG_GUIDELINES,
  UG_TRACKS,
  VIDEO_CONTENT,
  VIDEO_RULES,
} from "@/components/marketing/content";

export const metadata: Metadata = {
  title: "Undergraduate",
  description: "Undergraduate Innovation Project Competition — six tracks and a 10-minute research video.",
};

export default function UndergraduatePage() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,0.9fr)_1px_minmax(0,1.1fr)] lg:items-stretch lg:gap-x-14">
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            Undergraduate Innovation Project Competition
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">
            The competition is open to undergraduate students from local and international higher
            education institutions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register?level=undergraduate"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#d6a11e] px-7 text-sm font-bold tracking-wide text-[#1a1408] transition-colors hover:bg-[#e2b43a]"
            >
              Register Now
              <IconArrowRight className="size-4" aria-hidden />
            </Link>
            <a href="#guidelines" className="inline-flex rounded-full">
              <LiquidGlass
                tint={0}
                className={`${cardGlassClass} text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100`}
                style={cardGlassStyle}
                contentClassName="flex h-12 items-center justify-center px-7 text-sm font-bold tracking-wide"
              >
                Guidelines
              </LiquidGlass>
            </a>
          </div>
        </div>
        <div className="hidden bg-[#e8b84a] lg:block" aria-hidden />
        <TrackList tracks={UG_TRACKS} />
      </section>

      <RulesSection
        id="guidelines"
        title="General Guidelines"
        rules={UG_GUIDELINES}
      />

      <GuidelineSection
        title="Abstract Submission Guidelines"
        intro="All undergraduate entries must submit a concise project abstract through the official registration portal."
        panels={[
          { title: "Abstract requirements", items: ABSTRACT_REQUIREMENTS },
          { title: "Required content", items: ABSTRACT_CONTENT },
        ]}
      />
      <GuidelineSection
        title="Video Presentation Guidelines"
        intro="Submit a recorded project presentation of no more than TEN (10) minutes."
        panels={[
          { title: "Video content", items: VIDEO_CONTENT },
          { title: "Technical & ethical rules", items: VIDEO_RULES },
        ]}
      />
      <GuidelineSection
        title="Full Paper Submission Guidelines"
        intro="Participants who wish to be considered for publication may submit a full paper."
        panels={[
          {
            title: "Paper requirements",
            items: ["Optional submission", ...PAPER_REQUIREMENTS],
          },
          {
            title: "Publication consideration",
            items: [
              "Eligible full papers may be considered for the Journal of Computing Technologies and Creative Content (JTeC).",
              "Submission does not guarantee publication. All papers remain subject to editorial screening, peer review and acceptance.",
            ],
            extra: (
              <p className="mt-6 text-center text-sm">
                <span className="text-white/70">Full-paper template coming soon</span>
                <span className="mx-2 text-white/40">|</span>
                <Link href="/register?level=undergraduate" className="font-semibold text-[#e8b84a] underline-offset-2 hover:underline">
                  Submit full paper
                </Link>
              </p>
            ),
          },
        ]}
      />
    </>
  );
}
