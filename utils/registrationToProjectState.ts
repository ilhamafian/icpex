import type { ProjectState } from "@/components/ProjectFields";
import type { DocumentRequirement } from "@/schemas/documentRequirement";
import type { Registration } from "@/schemas/registrationSchema";
import { DEFAULT_PHONE_CODE, DIAL_CODES } from "@/utils/phoneCodes";

function splitPhone(phone: string) {
  const trimmed = phone.trim();
  const match = trimmed.match(/^(\+\d+)\s+([\s\S]+)$/);
  if (match && DIAL_CODES.includes(match[1])) {
    return { code: match[1], number: match[2] };
  }
  return { code: DEFAULT_PHONE_CODE, number: trimmed };
}

/** Rebuild the registration form state from a stored project. */
export function registrationToProjectState(
  registration: Registration,
  requirements: DocumentRequirement[]
): ProjectState {
  const phone = splitPhone(registration.participant.phone);
  const uploads: ProjectState["uploads"] = {};
  const links: ProjectState["links"] = {};
  const requirementById = new Map(requirements.map((requirement) => [requirement.id, requirement]));

  for (const document of registration.documents) {
    if (!document.requirement_id) continue;
    const requirement = requirementById.get(document.requirement_id);
    if (requirement?.input_type === "LINK") {
      links[document.requirement_id] = document.file_url;
      continue;
    }
    uploads[document.requirement_id] = {
      file_name: document.file_name,
      file_url: document.file_url,
    };
  }

  return {
    key: "existing",
    categoryId: String(registration.category_id),
    participantName: registration.participant.name,
    participantEmail: registration.participant.email,
    phoneCode: phone.code,
    phone: phone.number,
    educationLevel: registration.participant.education_level,
    govIdType: registration.participant.government_id.type,
    govIdNumber: registration.participant.government_id.number,
    projectTitle: registration.project.title,
    projectAbstract: registration.project.abstract,
    leadName: registration.team.lead.name,
    leadEmail: registration.team.lead.email,
    members: registration.team.members.map((member) => ({
      name: member.name,
      email: member.email,
    })),
    supervisors: registration.supervisors.length
      ? registration.supervisors.map((supervisor) => ({
          name: supervisor.name,
          email: supervisor.email,
        }))
      : [{ name: "", email: "" }],
    uploads,
    links,
  };
}
