import type { Metadata } from "next";

import { ContentPage, DatesList } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "Important Dates",
  description: "Key dates for I-CRIVE 2027 registration, judging and the closing ceremony.",
};

export default function DatesPage() {
  return (
    <ContentPage eyebrow="Schedule" title="Important Dates">
      <DatesList />
    </ContentPage>
  );
}
