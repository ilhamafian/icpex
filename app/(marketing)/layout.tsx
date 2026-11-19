import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: {
    default: "I-CRIVE 2027",
    template: "%s · I-CRIVE 2027",
  },
  description:
    "International Competition for Research, Innovation & Value Excellence, organised by the Research & Innovation Section, UniKL MIIT.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
