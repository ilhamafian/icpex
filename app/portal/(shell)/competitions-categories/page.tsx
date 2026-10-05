import { CompetitionsCategoriesManager } from "@/components/CompetitionsCategoriesManager";
import { CategoryModel } from "@/models/Category";
import { CompetitionModel } from "@/models/Competition";
import {
  serializeCategory,
  serializeCompetition,
} from "@/utils/serializeCatalog";
import { getCurrentCompetitionId } from "@/utils/currentCompetition";
import { requirePortalSection } from "@/utils/requirePortalAccess";

async function loadCatalog() {
  try {
    const [competitions, categories] = await Promise.all([
      new CompetitionModel().find({}, { sort: { start_date: -1 } }),
      new CategoryModel().find({}, { sort: { name: 1 } }),
    ]);

    return {
      competitions: competitions.map(serializeCompetition),
      categories: categories.map(serializeCategory),
    };
  } catch {
    return { competitions: [], categories: [] };
  }
}

export default async function CompetitionsCategoriesPage() {
  await requirePortalSection("competitions-categories");
  const [{ competitions, categories }, currentCompetitionId] =
    await Promise.all([
      loadCatalog(),
      getCurrentCompetitionId().catch(() => null),
    ]);

  return (
    <CompetitionsCategoriesManager
      initialCompetitions={competitions}
      currentCompetitionId={currentCompetitionId}
      initialCategories={categories}
    />
  );
}
