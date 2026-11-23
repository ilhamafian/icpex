"use client";

import { useState } from "react";

import { ParticipantMarksView } from "@/components/ParticipantMarksView";
import {
  ScoringAudienceProvider,
  ScoringAudienceSwitch,
} from "@/components/ScoringAudienceSwitch";
import type { ScoringAudience } from "@/schemas/scoringAudience";
import type { LivePresentationDraft } from "@/schemas/competitionSchema";
import type { ParticipantMarkRow } from "@/utils/judgeLeaderReports";

export function ParticipantMarksAudience({
  competitionName,
  judgeRows,
  reviewerRows,
  showTrack,
  canNominate,
  liveSession,
}: {
  competitionName: string | null;
  judgeRows: ParticipantMarkRow[];
  reviewerRows: ParticipantMarkRow[];
  showTrack: boolean;
  canNominate: boolean;
  liveSession: LivePresentationDraft;
}) {
  const [audience, setAudience] = useState<ScoringAudience>("JUDGE");
  const rows = audience === "JUDGE" ? judgeRows : reviewerRows;

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 lg:px-6">
        <ScoringAudienceSwitch value={audience} onValueChange={setAudience} />
      </div>
      <ScoringAudienceProvider value={audience}>
        <ParticipantMarksView
          key={audience}
          competitionName={competitionName}
          rows={rows}
          showTrack={showTrack}
          canNominate={audience === "JUDGE" && canNominate}
          liveSession={liveSession}
        />
      </ScoringAudienceProvider>
    </div>
  );
}
