import type { Metadata } from "next";

import { ContentPage, InfoCard } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "Guidelines & Awards",
  description: "How undergraduate and postgraduate I-CRIVE entries are assessed, and the proposed awards.",
};

export default function GuidelinesPage() {
  return (
    <ContentPage eyebrow="Guidelines / Recognition" title="Guidelines & Awards">
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Undergraduate">
          <div className="space-y-4 text-center leading-relaxed text-white/80">
            <p>
              Innovation projects are evaluated against approved criteria for project quality,
              originality, demonstration, impact and communication.
            </p>
            <p>Proposed recognition: Best Project Video, Best Abstract and Best Paper.</p>
          </div>
        </InfoCard>
        <InfoCard title="Postgraduate">
          <div className="space-y-4 text-center leading-relaxed text-white/80">
            <p>
              Five-Minute Thesis presentations are assessed against approved criteria for research
              significance, clarity, delivery and audience engagement.
            </p>
            <p>Proposed recognition: Best Presenter, Best Slide and Best Paper.</p>
          </div>
        </InfoCard>
      </div>
    </ContentPage>
  );
}
