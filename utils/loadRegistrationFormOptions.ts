import "server-only";

import { CategoryModel } from "@/models/Category";
import { allowedEducationLevels } from "@/schemas/educationLevel";
import { effectiveDocumentRequirements } from "@/schemas/documentRequirement";
import { toIdString } from "@/schemas/objectId";
import { getCurrentCompetition } from "@/utils/currentCompetition";

export async function loadRegistrationFormOptions() {
  try {
    const [competition, categories] = await Promise.all([
      getCurrentCompetition(),
      new CategoryModel().getCategories(),
    ]);

    return {
      competitionId: competition ? toIdString(competition._id) : "",
      educationLevels: allowedEducationLevels(competition?.eligibility),
      documentRequirements: effectiveDocumentRequirements(competition),
      categories: (categories ?? []).map((category) => ({
        id: toIdString(category._id),
        name: category.name,
        educationLevel: category.education_level,
      })),
    };
  } catch {
    return {
      competitionId: "",
      educationLevels: allowedEducationLevels(undefined),
      documentRequirements: effectiveDocumentRequirements(null),
      categories: [],
    };
  }
}
