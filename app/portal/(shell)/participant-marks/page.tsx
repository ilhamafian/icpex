import { ParticipantMarksView } from "@/components/ParticipantMarksView";
import {
  canManageLivePresentation,
  educationLevelForRole,
} from "@/schemas/userRole";
import {
  emptyJudgeLeaderReport,
  loadJudgeLeaderReport,
} from "@/utils/judgeLeaderReports";
import { requirePortalSection } from "@/utils/requirePortalAccess";

export default async function ParticipantMarksPage() {
  const session = await requirePortalSection("participant-marks");
  const report = await loadJudgeLeaderReport(session.role).catch(
    emptyJudgeLeaderReport
  );

  return (
    <ParticipantMarksView
      competitionName={report.competition_name}
      rows={report.marks}
      showTrack={educationLevelForRole(session.role) === null}
      canNominate={canManageLivePresentation(session.role)}
      liveSession={report.live_presentation}
    />
  );
}
