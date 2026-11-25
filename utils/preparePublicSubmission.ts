import "server-only";

import type { WithId } from "mongodb";

import { CategoryModel } from "@/models/Category";
import type { Competition } from "@/schemas/competitionSchema";
import {
  effectiveDocumentRequirements,
  requirementsForLevel,
  requirementsForTiming,
  validateDocumentsAgainstRequirements,
  type DocumentRequirement,
} from "@/schemas/documentRequirement";
import {
  EDUCATION_LEVEL_LABELS,
  allowedEducationLevels,
} from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import type { SubmissionForm } from "@/schemas/submissionSchema";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { normalizeInstitution, quoteSubmission, type SubmissionQuote } from "@/utils/pricing";

export type PreparedSubmission = {
  competition: WithId<Competition>;
  competitionId: string;
  institution: SubmissionForm["institution"];
  institutionKey: string;
  projects: SubmissionForm["projects"];
  categoryNameById: Map<string, string>;
  documentRequirements: DocumentRequirement[];
  quote: SubmissionQuote;
};

export async function preparePublicSubmission(
  data: SubmissionForm,
  options?: { excludeRegistrationId?: string }
): Promise<{ ok: true; value: PreparedSubmission } | { ok: false; error: string }> {
  const { institution, projects } = data;
  const competition = await getCurrentCompetition();
  const competitionId = String(data.competition_id);
  if (!competition || toIdString(competition._id) !== competitionId) {
    return { ok: false, error: "No published competition available for registration." };
  }

  const allowedLevels = allowedEducationLevels(competition.eligibility);
  const categories = await new CategoryModel().find({});
  const categoryById = new Map(
    categories.map((category) => [toIdString(category._id), category])
  );
  const categoryNameById = new Map(
    categories.map((category) => [toIdString(category._id), category.name])
  );

  for (const [index, project] of projects.entries()) {
    if (!allowedLevels.includes(project.participant.education_level)) {
      return {
        ok: false,
        error: `Project ${index + 1}: this competition is open to ${allowedLevels
          .map((level) => EDUCATION_LEVEL_LABELS[level].toLowerCase())
          .join(" and ")} participants only.`,
      };
    }
    const category = categoryById.get(String(project.category_id));
    if (!category) {
      return { ok: false, error: `Project ${index + 1}: invalid category.` };
    }
    if (
      category.education_level &&
      category.education_level !== project.participant.education_level
    ) {
      return {
        ok: false,
        error: `Project ${index + 1}: that track is for ${EDUCATION_LEVEL_LABELS[
          category.education_level
        ].toLowerCase()} participants.`,
      };
    }

    const documentRequirements = requirementsForTiming(
      requirementsForLevel(
        effectiveDocumentRequirements(competition),
        project.participant.education_level
      ),
      "BEFORE_PAYMENT"
    );
    const documents = project.documents.filter((document) =>
      documentRequirements.some((requirement) => requirement.id === document.requirement_id)
    );
    project.documents = documents;
    const documentErrors = validateDocumentsAgainstRequirements(
      documents,
      documentRequirements
    );
    const firstDocumentError = Object.values(documentErrors)[0];
    if (firstDocumentError) {
      return { ok: false, error: `Project ${index + 1}: ${firstDocumentError}` };
    }
  }

  const institutionKey = normalizeInstitution(institution.name);
  if (!institutionKey) {
    return { ok: false, error: "University name is required." };
  }

  const quote = await quoteSubmission(
    competitionId,
    institution,
    projects.length,
    options
  );

  return {
    ok: true,
    value: {
      competition,
      competitionId,
      institution,
      institutionKey,
      projects,
      categoryNameById,
      documentRequirements: effectiveDocumentRequirements(competition),
      quote,
    },
  };
}
