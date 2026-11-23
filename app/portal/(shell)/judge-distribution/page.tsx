import { JudgeDistributionAudience } from "@/components/JudgeDistributionAudience";
import {
  emptyJudgeLeaderReport,
  loadJudgeLeaderReport,
} from "@/utils/judgeLeaderReports";
import { requirePortalSection } from "@/utils/requirePortalAccess";

export default async function JudgeDistributionPage() {
  const session = await requirePortalSection("judge-distribution");
  const [judgeReport, reviewerReport] = await Promise.all([
    loadJudgeLeaderReport(session.role, "JUDGE").catch(emptyJudgeLeaderReport),
    loadJudgeLeaderReport(session.role, "PAPER_REVIEWER").catch(
      emptyJudgeLeaderReport
    ),
  ]);

  return (
    <JudgeDistributionAudience
      competitionName={
        judgeReport.competition_name ?? reviewerReport.competition_name
      }
      judgeRows={judgeReport.distribution}
      reviewerRows={reviewerReport.distribution}
      judgeUnassigned={judgeReport.unassigned_participants}
      reviewerUnassigned={reviewerReport.unassigned_participants}
    />
  );
}
