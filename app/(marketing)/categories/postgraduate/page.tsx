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
  LIVE_CONTENT,
  LIVE_REQUIREMENTS,
  PAPER_REQUIREMENTS,
  PG_GUIDELINES,
  PG_TRACKS,
  POSTER_CONTENT,
  POSTER_REQUIREMENTS,
} from "@/components/marketing/content";

const FULL_PAPER_TEMPLATE_HREF =
  "/files/" + encodeURIComponent("I-CRIVE2027_Full paper template_JTeC.docx");
const POSTER_TEMPLATE_HREF =
  "/files/" + encodeURIComponent("5MT poster_Template_1 slide.pptx");

export const metadata: Metadata = {
  title: "Postgraduate",
  description: "Postgraduate Five-Minute Thesis (5MT) Competition — three tracks and a live presentation.",
};

export default function PostgraduatePage() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,0.9fr)_1px_minmax(0,1.1fr)] lg:items-stretch lg:gap-x-14">
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            Postgraduate Five-Minute Thesis (5MT)
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">
            A platform for Master’s and PhD researchers to communicate their research clearly,
            concisely and persuasively within five minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
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
        <TrackList tracks={PG_TRACKS} />
      </section>

      <RulesSection
        id="guidelines"
        title="General Guidelines"
        rules={PG_GUIDELINES}
      />

      <GuidelineSection
        title="Abstract Submission Guidelines"
        intro="All postgraduate entries must submit a concise project abstract through the official registration portal."
        panels={[
          { title: "Abstract requirements", items: ABSTRACT_REQUIREMENTS },
          { title: "Required content", items: ABSTRACT_CONTENT },
        ]}
      />
      <GuidelineSection
        title="Poster Submission Guidelines"
        panels={[
          {
            title: "Poster requirements",
            items: POSTER_REQUIREMENTS,
            extra: (
              <p className="mt-6 text-center text-sm">
                <a
                  href={POSTER_TEMPLATE_HREF}
                  download
                  className="font-semibold text-[#e8b84a] underline-offset-2 hover:underline"
                >
                  Download poster template
                </a>
              </p>
            ),
          },
          { title: "Required content", items: POSTER_CONTENT },
        ]}
      />
      <GuidelineSection
        title="Live 5MT Presentation Guidelines"
        intro="Present your research clearly and confidently during the scheduled online session."
        panels={[
          { title: "Presentation requirements", items: LIVE_REQUIREMENTS },
          { title: "Required presentation content", items: LIVE_CONTENT },
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
                <a
                  href={FULL_PAPER_TEMPLATE_HREF}
                  download
                  className="font-semibold text-[#e8b84a] underline-offset-2 hover:underline"
                >
                  Download full-paper template
                </a>
                <span className="mx-2 text-white/40">|</span>
                <Link href="/register?level=postgraduate" className="font-semibold text-[#e8b84a] underline-offset-2 hover:underline">
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
