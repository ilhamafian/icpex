"use client";

import { createContext, useContext } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SCORING_AUDIENCE_LABELS,
  type ScoringAudience,
} from "@/schemas/scoringAudience";

const ScoringAudienceContext = createContext<ScoringAudience>("JUDGE");

export function ScoringAudienceProvider({
  value,
  children,
}: {
  value: ScoringAudience;
  children: React.ReactNode;
}) {
  return (
    <ScoringAudienceContext.Provider value={value}>
      {children}
    </ScoringAudienceContext.Provider>
  );
}

export function useScoringAudience() {
  return useContext(ScoringAudienceContext);
}

export function ScoringAudienceSwitch({
  value,
  onValueChange,
}: {
  value: ScoringAudience;
  onValueChange: (audience: ScoringAudience) => void;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as ScoringAudience)}
    >
      <TabsList>
        <TabsTrigger value="JUDGE">{SCORING_AUDIENCE_LABELS.JUDGE}</TabsTrigger>
        <TabsTrigger value="PAPER_REVIEWER">
          {SCORING_AUDIENCE_LABELS.PAPER_REVIEWER}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
