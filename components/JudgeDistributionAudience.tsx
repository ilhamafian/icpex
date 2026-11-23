"use client";

import { useState } from "react";

import { JudgeDistributionView } from "@/components/JudgeDistributionView";
import {
  ScoringAudienceProvider,
  ScoringAudienceSwitch,
} from "@/components/ScoringAudienceSwitch";
import type { ScoringAudience } from "@/schemas/scoringAudience";
import type { JudgeDistributionRow } from "@/utils/judgeLeaderReports";

export function JudgeDistributionAudience({
  competitionName,
  judgeRows,
  reviewerRows,
  judgeUnassigned,
  reviewerUnassigned,
}: {
  competitionName: string | null;
  judgeRows: JudgeDistributionRow[];
  reviewerRows: JudgeDistributionRow[];
  judgeUnassigned: number;
  reviewerUnassigned: number;
}) {
  const [audience, setAudience] = useState<ScoringAudience>("JUDGE");

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 lg:px-6">
        <ScoringAudienceSwitch value={audience} onValueChange={setAudience} />
      </div>
      <ScoringAudienceProvider value={audience}>
        <JudgeDistributionView
          key={audience}
          competitionName={competitionName}
          rows={audience === "JUDGE" ? judgeRows : reviewerRows}
          unassignedParticipants={
            audience === "JUDGE" ? judgeUnassigned : reviewerUnassigned
          }
        />
      </ScoringAudienceProvider>
    </div>
  );
}
