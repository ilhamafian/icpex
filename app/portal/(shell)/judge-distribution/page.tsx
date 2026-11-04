import { JudgeDistributionView } from "@/components/JudgeDistributionView";
import {
  emptyJudgeLeaderReport,
  loadJudgeLeaderReport,
} from "@/utils/judgeLeaderReports";
import { requirePortalSection } from "@/utils/requirePortalAccess";

export default async function JudgeDistributionPage() {
  const session = await requirePortalSection("judge-distribution");
  const report = await loadJudgeLeaderReport(session.role).catch(
    emptyJudgeLeaderReport
  );

  return (
    <JudgeDistributionView
      competitionName={report.competition_name}
      rows={report.distribution}
      unassignedParticipants={report.unassigned_participants}
    />
  );
}
