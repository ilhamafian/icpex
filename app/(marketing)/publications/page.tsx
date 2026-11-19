import type { Metadata } from "next";

import { ContentPage, InfoCard } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "Publication Opportunities",
  description: "ISBN abstract book and optional full-paper consideration in JTeC.",
};

export default function PublicationsPage() {
  return (
    <ContentPage eyebrow="Publications / JTeC" title="Publication Opportunities">
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="I-CRIVE Abstract Book">
          <p className="text-center leading-relaxed text-white/80">
            Accepted abstracts may be included in the official I-CRIVE abstract book with ISBN,
            subject to submission and editorial requirements.
          </p>
        </InfoCard>
        <InfoCard title="Full Paper (Optional)">
          <p className="text-center leading-relaxed text-white/80">
            Authors may submit a full paper for possible consideration by the Journal of Computing
            Technologies and Creative Content (JTeC), e-ISSN 2550-1550.
          </p>
        </InfoCard>
      </div>
      <p className="mx-auto mt-10 max-w-3xl text-center leading-relaxed text-white/80">
        All manuscripts are subject to editorial screening, peer review and acceptance
        requirements. Submission does not guarantee publication.
      </p>
    </ContentPage>
  );
}
