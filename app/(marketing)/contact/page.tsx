import type { Metadata } from "next";

import { ContentPage } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "Contact Us",
};

export default function ContactPage() {
  return (
    <ContentPage eyebrow="About" title="Contact Us">
      <div className="max-w-2xl space-y-4 text-lg text-white/80">
        <p>Contact details will be published here.</p>
        <p>
          I-CRIVE 2027 is organised by the Research & Innovation Section, Universiti Kuala Lumpur
          Malaysian Institute of Information Technology (UniKL MIIT).
        </p>
      </div>
    </ContentPage>
  );
}
