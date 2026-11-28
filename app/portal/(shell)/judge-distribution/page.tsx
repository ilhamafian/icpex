import { JudgeDistributionAudience } from "@/components/JudgeDistributionAudience";
import { leaderAudiences } from "@/schemas/userRole";
import {
  emptyJudgeLeaderReport,
  loadJudgeLeaderReport,
} from "@/utils/judgeLeaderReports";
import { requirePortalSection } from "@/utils/requirePortalAccess";

export default async function JudgeDistributionPage() {
  const session = await requirePortalSection("judge-distribution");
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
    <JudgeDistributionAudience
      competitionName={
        judgeReport.competition_name ?? reviewerReport.competition_name
      }
      audiences={audiences}
      judgeRows={judgeReport.distribution}
      reviewerRows={reviewerReport.distribution}
      judgeUnassigned={judgeReport.unassigned_participants}
      reviewerUnassigned={reviewerReport.unassigned_participants}
    />
  );
}
