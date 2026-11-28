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
  audiences,
  judgeRows,
  reviewerRows,
  judgeUnassigned,
  reviewerUnassigned,
}: {
  competitionName: string | null;
  audiences: ScoringAudience[];
  judgeRows: JudgeDistributionRow[];
  reviewerRows: JudgeDistributionRow[];
  judgeUnassigned: number;
  reviewerUnassigned: number;
}) {
  const [audience, setAudience] = useState<ScoringAudience>(
    audiences[0] ?? "JUDGE"
  );

  return (
    <div className="flex flex-col gap-4">
      {audiences.length > 1 ? (
        <div className="px-4 lg:px-6">
          <ScoringAudienceSwitch value={audience} onValueChange={setAudience} />
        </div>
      ) : null}
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
