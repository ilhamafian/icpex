import { ParticipantMarksAudience } from "@/components/ParticipantMarksAudience";
import {
  canManageLivePresentation,
  educationLevelForRole,
  leaderAudiences,
} from "@/schemas/userRole";
import {
  emptyJudgeLeaderReport,
  loadJudgeLeaderReport,
} from "@/utils/judgeLeaderReports";
import { requirePortalSection } from "@/utils/requirePortalAccess";

export default async function ParticipantMarksPage() {
  const session = await requirePortalSection("participant-marks");
  const audiences = leaderAudiences(session.role);
  const [judgeReport, reviewerReport] = await Promise.all([
    audiences.includes("JUDGE")
      ? loadJudgeLeaderReport(session.role, "JUDGE").catch(emptyJudgeLeaderReport)
      : emptyJudgeLeaderReport(),
    audiences.includes("PAPER_REVIEWER")
      ? loadJudgeLeaderReport(session.role, "PAPER_REVIEWER").catch(
          emptyJudgeLeaderReport
        )
      : emptyJudgeLeaderReport(),
  ]);

  return (
    <ParticipantMarksAudience
      competitionName={
        judgeReport.competition_name ?? reviewerReport.competition_name
      }
      audiences={audiences}
      judgeRows={judgeReport.marks}
      reviewerRows={reviewerReport.marks}
      showTrack={educationLevelForRole(session.role) === null}
      canNominate={canManageLivePresentation(session.role)}
      liveSession={judgeReport.live_presentation}
    />
  );
}
