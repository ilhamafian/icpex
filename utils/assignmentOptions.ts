import type { Registration } from "@/schemas/registrationSchema";

/** Lightweight registration row for assignment pickers. */
export type AssignmentRegistrationOption = {
  registration_number: string;
  participant_name: string;
  project_title: string;
  status: Registration["status"];
};

export function toAssignmentRegistrationOption(
  registration: Registration
): AssignmentRegistrationOption {
  return {
    registration_number: registration.registration_number,
    participant_name: registration.participant.name,
    project_title: registration.project.title,
    status: registration.status,
  };
}
