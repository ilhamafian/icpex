import { JudgingCriteriaManager } from "@/components/JudgingCriteriaManager";
import { JudgeCriteriaModel } from "@/models/JudgeCriteria";
import { JudgeDeliverableModel } from "@/models/JudgeDeliverable";
import { serializeJudgeCriteria } from "@/utils/serializeJudgeCriteria";
import { serializeJudgeDeliverable } from "@/utils/serializeJudgeDeliverable";
import { requirePortalSection } from "@/utils/requirePortalAccess";

async function loadCriteria() {
  try {
    const criteria = await new JudgeCriteriaModel().find(
      {},
      { sort: { created_at: 1, name: 1 } }
    );
    return criteria.map(serializeJudgeCriteria);
  } catch {
    return [];
  }
}

async function loadDeliverables() {
  try {
    const deliverables = await new JudgeDeliverableModel().find({});
    return deliverables.map(serializeJudgeDeliverable);
  } catch {
    return [];
  }
}

export default async function JudgingCriteriaPage() {
  await requirePortalSection("judging-criteria");
  const [criteria, deliverables] = await Promise.all([
    loadCriteria(),
    loadDeliverables(),
  ]);

  return (
    <JudgingCriteriaManager
      initialCriteria={criteria}
      initialDeliverables={deliverables}
    />
  );
}
