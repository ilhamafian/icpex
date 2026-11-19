import type { Metadata } from "next";
import Link from "next/link";

import { GuidelineSection, RegisterButton, TrackList } from "@/components/marketing/blocks";
import {
  ABSTRACT_CONTENT,
  ABSTRACT_REQUIREMENTS,
  LIVE_CONTENT,
  LIVE_REQUIREMENTS,
  PAPER_REQUIREMENTS,
  PG_TRACKS,
} from "@/components/marketing/content";

export const metadata: Metadata = {
  title: "Postgraduate",
  description: "Postgraduate Five-Minute Thesis (5MT) Competition — three tracks and a live presentation.",
};

export default function PostgraduatePage() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl items-start gap-10 px-6 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="lg:border-r lg:border-[#e8b84a] lg:pr-10">
          <p className="text-5xl font-bold text-[#e8b84a]">
            5 <span className="text-2xl font-semibold text-white">minute research video</span>
          </p>
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-balance">
            Postgraduate Five-Minute Thesis (5MT)
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">
            A platform for Master’s and PhD researchers to communicate their research clearly,
            concisely and persuasively within five minutes.
          </p>
          <div className="mt-8">
            <RegisterButton href="/register?level=postgraduate">Register now</RegisterButton>
          </div>
        </div>
        <TrackList tracks={PG_TRACKS} />
      </section>

      <GuidelineSection
        title="Abstract Submission Guidelines"
        intro="All postgraduate entries must submit a concise research abstract through the official registration portal."
        panels={[
          { title: "Abstract requirements", items: ABSTRACT_REQUIREMENTS },
          { title: "Required content", items: ABSTRACT_CONTENT },
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
        title="Full Paper Submission (Optional)"
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
