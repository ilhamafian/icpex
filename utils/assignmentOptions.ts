import type { Registration } from "@/schemas/registrationSchema";

/** Lightweight registration row for assignment pickers. */
export type AssignmentRegistrationOption = {
  registration_number: string;
  participant_name: string;
  institution_name: string;
  project_title: string;
  status: Registration["status"];
  created_at?: string;
};

export function toAssignmentRegistrationOption(
  registration: Registration
): AssignmentRegistrationOption {
  return {
    registration_number: registration.registration_number,
    participant_name: registration.participant.name,
    institution_name: registration.participant.institution.name,
    project_title: registration.project.title,
    status: registration.status,
    created_at: registration.created_at
      ? new Date(registration.created_at).toISOString()
      : undefined,
  };
}
