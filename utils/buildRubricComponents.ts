import "server-only";

import { ObjectId } from "mongodb";

import type {
  JudgeRubricComponent,
  JudgeRubricComponentInput,
} from "@/schemas/judgeRubricSchema";
import { toIdString } from "@/schemas/objectId";

export function buildRubricComponents(
  input: JudgeRubricComponentInput[],
  existingIds: Set<string>
): { components: JudgeRubricComponent[] } | { error: string } {
  const components: JudgeRubricComponent[] = [];
  for (const [index, component] of input.entries()) {
    const id = component._id
      ? toIdString(component._id)
      : new ObjectId().toHexString();
    if (component._id && !existingIds.has(id)) {
      return {
        error: "One or more components do not belong to this rubric.",
      };
    }
    components.push({
      _id: id,
      name: component.name,
      description: component.description,
      weight: component.weight,
      sort_order: index,
      bands: component.bands,
    });
  }
  return { components };
}
