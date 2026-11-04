import { JudgingCriteriaManager } from "@/components/JudgingCriteriaManager";
import { JudgeRubricModel } from "@/models/JudgeRubric";
import { educationLevelForRole } from "@/schemas/userRole";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { serializeJudgeRubric } from "@/utils/serializeJudgeRubric";

export default async function JudgingCriteriaPage() {
  const session = await requirePortalSection("judging-criteria");
  const track = educationLevelForRole(session.role);

  if (!session.competition_id) {
    return (
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Judging Criteria</h2>
        <p className="text-sm text-muted-foreground">
          Choose a competition before defining rubrics.
        </p>
      </div>
    );
  }

  let rubrics: ReturnType<typeof serializeJudgeRubric>[] = [];
  try {
    const found = await new JudgeRubricModel().find(
      track
        ? {
            competition_id: session.competition_id,
            education_level: track,
          }
        : { competition_id: session.competition_id },
      { sort: { sort_order: 1, created_at: 1 } }
    );
    rubrics = found.map(serializeJudgeRubric);
  } catch {
    rubrics = [];
  }

  return (
    <JudgingCriteriaManager initialRubrics={rubrics} lockedTrack={track} />
  );
}
