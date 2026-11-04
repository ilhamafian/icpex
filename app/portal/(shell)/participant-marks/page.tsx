import { ParticipantMarksView } from "@/components/ParticipantMarksView";
import { educationLevelForRole } from "@/schemas/userRole";
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
    />
  );
}
