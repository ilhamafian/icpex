import { JudgingCriteriaManager } from "@/components/JudgingCriteriaManager";
import { JudgeCriteriaModel } from "@/models/JudgeCriteria";
import { serializeJudgeCriteria } from "@/utils/serializeJudgeCriteria";

async function loadCriteria() {
  try {
    const criteria = await new JudgeCriteriaModel().find(
      {},
      { sort: { type: 1, name: 1 } }
    );
    return criteria.map(serializeJudgeCriteria);
  } catch {
    return [];
  }
}

export default async function JudgingCriteriaPage() {
  const criteria = await loadCriteria();

  return <JudgingCriteriaManager initialCriteria={criteria} />;
}
