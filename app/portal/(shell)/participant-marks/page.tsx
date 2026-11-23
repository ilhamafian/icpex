import { ParticipantMarksAudience } from "@/components/ParticipantMarksAudience";
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
  const [judgeReport, reviewerReport] = await Promise.all([
    loadJudgeLeaderReport(session.role, "JUDGE").catch(emptyJudgeLeaderReport),
    loadJudgeLeaderReport(session.role, "PAPER_REVIEWER").catch(
      emptyJudgeLeaderReport
    ),
  ]);

  return (
    <ParticipantMarksAudience
      competitionName={
        judgeReport.competition_name ?? reviewerReport.competition_name
      }
      judgeRows={judgeReport.marks}
      reviewerRows={reviewerReport.marks}
      showTrack={educationLevelForRole(session.role) === null}
      canNominate={canManageLivePresentation(session.role)}
      liveSession={judgeReport.live_presentation}
    />
  );
}
