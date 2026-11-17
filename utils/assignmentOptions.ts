import {
  storageTypeForRequirement,
  type DocumentRequirement,
} from "@/schemas/documentRequirement";
import type { EducationLevel } from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import type { PaymentStatus } from "@/schemas/paymentSchema";
import type { Registration } from "@/schemas/registrationSchema";

type RegistrationDocumentType = Registration["documents"][number]["type"];

/** A file or link stored on the registration. */
export type AssignmentDocument = {
  requirement_id?: string;
  label?: string;
  type: RegistrationDocumentType;
  file_url: string;
};

/** Lightweight registration row for assignment pickers. */
export type AssignmentRegistrationOption = {
  registration_number: string;
  participant_name: string;
  institution_name: string;
  institution_key?: string;
  category_id: string;
  category_name: string;
  education_level: EducationLevel;
  project_title: string;
  status: Registration["status"];
  /** Latest payment's status; null when none is recorded. Omitted where not loaded. */
  payment_status?: PaymentStatus | null;
  documents: AssignmentDocument[];
  document_count: number;
  created_at?: string;
};

/** One Judge Assignments column, merged when both streams share a name. */
export type AssignmentDocumentColumn = {
  key: string;
  name: string;
  requirementIds: string[];
  inputType: DocumentRequirement["input_type"];
};

export function assignmentDocumentColumns(
  requirements: DocumentRequirement[],
  track: EducationLevel | null
): AssignmentDocumentColumn[] {
  const scoped = track
    ? requirements.filter((item) => item.education_level === track)
    : requirements;
  const byName = new Map<string, AssignmentDocumentColumn>();
  for (const requirement of scoped) {
    const name = requirement.name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.requirementIds.push(requirement.id);
      continue;
    }
    byName.set(key, {
      key,
      name,
      requirementIds: [requirement.id],
      inputType: requirement.input_type,
    });
  }
  return [...byName.values()];
}

export function documentUrlForColumn(
  documents: AssignmentDocument[],
  column: AssignmentDocumentColumn
) {
  const byId = documents.find(
    (doc) =>
      doc.requirement_id &&
      column.requirementIds.includes(doc.requirement_id)
  );
  if (byId) return byId.file_url;
  const byLabel = documents.find(
    (doc) => doc.label?.trim().toLowerCase() === column.key
  );
  if (byLabel) return byLabel.file_url;
  const legacy = storageTypeForRequirement({
    name: column.name,
    input_type: column.inputType,
  });
  return documents.find((doc) => doc.type === legacy)?.file_url ?? null;
}

export function toAssignmentRegistrationOption(
  registration: Registration,
  paymentStatus?: PaymentStatus | null,
  categoryName = ""
): AssignmentRegistrationOption {
  return {
    registration_number: registration.registration_number,
    participant_name: registration.participant.name,
    institution_name: registration.participant.institution.name,
    institution_key: registration.institution_key,
    category_id: toIdString(registration.category_id),
    category_name: categoryName,
    education_level: registration.participant.education_level,
    project_title: registration.project.title,
    status: registration.status,
    ...(paymentStatus !== undefined ? { payment_status: paymentStatus } : {}),
    documents: registration.documents.map((doc) => ({
      requirement_id: doc.requirement_id,
      label: doc.label,
      type: doc.type,
      file_url: doc.file_url,
    })),
    document_count: registration.documents.length,
    created_at: registration.created_at
      ? new Date(registration.created_at).toISOString()
      : undefined,
  };
}
