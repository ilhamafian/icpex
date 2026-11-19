import type { Metadata } from "next";

import { ContentPage } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "Organising Committee",
};

export default function CommitteePage() {
  return (
    <ContentPage eyebrow="About" title="Organising Committee">
      <p className="max-w-2xl text-lg text-white/80">
        Committee members will be listed here once confirmed.
      </p>
    </ContentPage>
  );
}
