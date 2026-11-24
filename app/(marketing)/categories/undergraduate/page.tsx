import type { Metadata } from "next";
import Link from "next/link";

import { GuidelineSection, RegisterButton, RulesSection, TrackList } from "@/components/marketing/blocks";
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
      <section className="mx-auto grid w-full max-w-6xl items-start gap-10 px-6 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="lg:border-r lg:border-[#e8b84a] lg:pr-10">
          <p className="text-5xl font-bold text-[#e8b84a]">
            10 <span className="text-2xl font-semibold text-white">minute research video</span>
          </p>
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-balance">
            Undergraduate Innovation Project Competition
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">
            The competition is open to undergraduate students from local and international higher
            education institutions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <RegisterButton href="/register?level=undergraduate">Register now</RegisterButton>
            <RegisterButton href="#guidelines" tone="slate">
              Guidelines
            </RegisterButton>
          </div>
        </div>
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
