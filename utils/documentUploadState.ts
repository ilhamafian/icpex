import {
  requirementsForLevel,
  requirementsForTiming,
  type DocumentRequirement,
} from "@/schemas/documentRequirement";
import type { Registration } from "@/schemas/registrationSchema";
import type {
  DocumentUploadFile,
  DocumentUploadState,
} from "@/utils/documentUploadTypes";

export function afterPaymentRequirements(
  requirements: DocumentRequirement[] | undefined,
  level: Registration["participant"]["education_level"]
) {
  return requirementsForTiming(
    requirementsForLevel(requirements, level),
    "AFTER_PAYMENT"
  );
}

export function filesFor(
  documents: Registration["documents"],
  requirements: DocumentRequirement[]
): DocumentUploadFile[] {
  return requirements.map((requirement) => {
    const doc = documents.find(
      (item) => item.requirement_id === requirement.id
    );
    return {
      requirementId: requirement.id,
      label: requirement.name,
      required: requirement.required,
      inputType: requirement.input_type,
      acceptedFormats: requirement.accepted_formats,
      fileName: doc?.file_name,
      fileUrl: doc?.file_url,
    };
  });
}

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function documentUploadState(
  registration: Pick<
    Registration,
    "documents" | "documents_submitted_at" | "participant"
  >,
  requirements: DocumentRequirement[] | undefined
): DocumentUploadState | undefined {
  const after = afterPaymentRequirements(
    requirements,
    registration.participant.education_level
  );
  if (after.length === 0) return undefined;
  const submittedAt = toIso(registration.documents_submitted_at);
  return {
    open: !submittedAt,
    submittedAt,
    files: filesFor(registration.documents, after),
  };
}
