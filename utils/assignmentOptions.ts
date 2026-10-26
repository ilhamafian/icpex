import type { EducationLevel } from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import type { PaymentStatus } from "@/schemas/paymentSchema";
import type { Registration } from "@/schemas/registrationSchema";

type RegistrationDocumentType = Registration["documents"][number]["type"];

function documentFileUrl(
  registration: Registration,
  type: RegistrationDocumentType
) {
  return (
    registration.documents.find((doc) => doc.type === type)?.file_url ?? null
  );
}

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
  has_full_paper: boolean;
  abstract_file_url: string | null;
  video_url: string | null;
  full_paper_url: string | null;
  document_count: number;
  created_at?: string;
};

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
    has_full_paper: registration.documents.some(
      (doc) => doc.type === "FULL_PAPER"
    ),
    abstract_file_url: documentFileUrl(registration, "ABSTRACT"),
    video_url: documentFileUrl(registration, "VIDEO_LINK"),
    full_paper_url: documentFileUrl(registration, "FULL_PAPER"),
    document_count: registration.documents.length,
    created_at: registration.created_at
      ? new Date(registration.created_at).toISOString()
      : undefined,
  };
}
