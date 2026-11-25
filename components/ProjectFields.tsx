"use client";

import { upload } from "@vercel/blob/client";
import {
  acceptAttrForFormats,
  formatLabels,
  requirementsForLevel,
  requirementsForTiming,
  storageTypeForRequirement,
  type DocumentRequirement,
} from "@/schemas/documentRequirement";
import {
  EDUCATION_LEVEL_LABELS,
  type EducationLevel,
} from "@/schemas/educationLevel";
import { MAX_TEAM_MEMBERS } from "@/schemas/registrationSchema";
import type { SubmissionProject } from "@/schemas/submissionSchema";
import { FilePicker } from "@/components/FilePicker";
import {
  Field,
  FieldError,
  inputClassName,
  linkButtonClassName,
  mutedTextClassName,
  Section,
  textareaClassName,
} from "@/components/marketing/registrationFormUi";
import { DEFAULT_PHONE_CODE, DIAL_CODES } from "@/utils/phoneCodes";

type Option = {
  id: string;
  name: string;
  /** When set, the category is only offered for that education stream. */
  educationLevel?: EducationLevel;
};
type Person = { name: string; email: string };
type IdType = SubmissionProject["participant"]["government_id"]["type"];
export type UploadState = {
  file_name: string;
  file_url: string;
  uploading?: boolean;
  uploadError?: string;
};

export type ProjectState = {
  /** Stable React key — projects can be removed from the middle. */
  key: string;
  categoryId: string;
  participantName: string;
  participantEmail: string;
  /** Dialling code that prefixes `phone`, e.g. "+60". */
  phoneCode: string;
  phone: string;
  educationLevel: EducationLevel;
  govIdType: IdType;
  govIdNumber: string;
  projectTitle: string;
  projectAbstract: string;
  leadName: string;
  leadEmail: string;
  members: Person[];
  supervisors: Person[];
  /** File uploads keyed by document requirement id. */
  uploads: Record<string, UploadState>;
  /** Link values keyed by document requirement id. */
  links: Record<string, string>;
};

function emptyUpload(): UploadState {
  return { file_name: "", file_url: "" };
}

export function emptyProject(
  categoryId: string,
  educationLevel: EducationLevel
): ProjectState {
  return {
    key: crypto.randomUUID(),
    categoryId,
    participantName: "",
    participantEmail: "",
    phoneCode: DEFAULT_PHONE_CODE,
    phone: "",
    educationLevel,
    govIdType: "NATIONAL_ID",
    govIdNumber: "",
    projectTitle: "",
    projectAbstract: "",
    leadName: "",
    leadEmail: "",
    members: [],
    supervisors: [{ name: "", email: "" }],
    uploads: {},
    links: {},
  };
}

function projectDocuments(
  project: ProjectState,
  requirements: DocumentRequirement[]
): SubmissionProject["documents"] {
  const documents: SubmissionProject["documents"] = [];
  const levelRequirements = requirementsForTiming(
    requirementsForLevel(requirements, project.educationLevel),
    "BEFORE_PAYMENT"
  );

  for (const requirement of levelRequirements) {
    if (requirement.input_type === "LINK") {
      const url = project.links[requirement.id]?.trim() ?? "";
      if (!url) continue;
      documents.push({
        type: storageTypeForRequirement(requirement),
        requirement_id: requirement.id,
        label: requirement.name,
        file_name: requirement.name,
        file_url: url,
      });
      continue;
    }

    const uploadState = project.uploads[requirement.id];
    if (!uploadState?.file_url) continue;
    documents.push({
      type: storageTypeForRequirement(requirement),
      requirement_id: requirement.id,
      label: requirement.name,
      file_name: uploadState.file_name,
      file_url: uploadState.file_url,
    });
  }

  return documents;
}

export function projectToPayload(
  project: ProjectState,
  requirements: DocumentRequirement[]
): SubmissionProject {
  const phoneNumber = project.phone.trim();
  return {
    category_id: project.categoryId,
    participant: {
      name: project.participantName,
      email: project.participantEmail,
      phone: phoneNumber
        ? `${project.phoneCode} ${phoneNumber}`
        : "",
      education_level: project.educationLevel,
      government_id: { type: project.govIdType, number: project.govIdNumber },
    },
    project: { title: project.projectTitle, abstract: project.projectAbstract },
    team: {
      lead: {
        name: project.leadName || project.participantName,
        email: project.leadEmail || project.participantEmail,
      },
      members: project.members.filter((m) => m.name.trim() || m.email.trim()),
    },
    supervisors: project.supervisors.filter(
      (s) => s.name.trim() || s.email.trim()
    ),
    documents: projectDocuments(project, requirements),
  };
}

export function projectIsUploading(project: ProjectState) {
  return Object.values(project.uploads).some((uploadState) =>
    Boolean(uploadState.uploading)
  );
}

type ProjectFieldsProps = {
  index: number;
  project: ProjectState;
  onChange: (update: (project: ProjectState) => ProjectState) => void;
  /** Errors for this project, keyed by path relative to the project. */
  errors: Record<string, string>;
  categories: Option[];
  educationLevels: EducationLevel[];
  documentRequirements: DocumentRequirement[];
  /** When true (e.g. landed via ?level=), the education select cannot be changed. */
  educationLevelLocked?: boolean;
  disabled?: boolean;
};

export function ProjectFields({
  index,
  project,
  onChange,
  errors,
  categories,
  educationLevels,
  documentRequirements,
  educationLevelLocked,
  disabled,
}: ProjectFieldsProps) {
  const id = (path: string) => `projects.${index}.${path}`;
  const levelCategories = categories.filter(
    (category) =>
      !category.educationLevel ||
      category.educationLevel === project.educationLevel
  );
  const levelRequirements = requirementsForLevel(
    documentRequirements,
    project.educationLevel
  );
  const beforePayment = requirementsForTiming(
    levelRequirements,
    "BEFORE_PAYMENT"
  );
  const afterPayment = requirementsForTiming(
    levelRequirements,
    "AFTER_PAYMENT"
  );

  function set<K extends keyof ProjectState>(key: K, value: ProjectState[K]) {
    onChange((current) => ({ ...current, [key]: value }));
  }

  function setEducationLevel(level: EducationLevel) {
    onChange((current) => {
      const nextCategories = categories.filter(
        (category) =>
          !category.educationLevel || category.educationLevel === level
      );
      const categoryStillValid = nextCategories.some(
        (category) => category.id === current.categoryId
      );
      return {
        ...current,
        educationLevel: level,
        categoryId: categoryStillValid
          ? current.categoryId
          : (nextCategories[0]?.id ?? ""),
      };
    });
  }

  function updatePeople(
    key: "members" | "supervisors",
    update: (people: Person[]) => Person[]
  ) {
    onChange((current) => ({ ...current, [key]: update(current[key]) }));
  }

  function updateUpload(requirementId: string, patch: Partial<UploadState>) {
    onChange((current) => ({
      ...current,
      uploads: {
        ...current.uploads,
        [requirementId]: {
          ...(current.uploads[requirementId] ?? emptyUpload()),
          ...patch,
        },
      },
    }));
  }

  function updateLink(requirementId: string, value: string) {
    onChange((current) => ({
      ...current,
      links: { ...current.links, [requirementId]: value },
    }));
  }

  async function handleDocumentUpload(
    requirementId: string,
    file: File | undefined
  ) {
    if (!file) return;
    updateUpload(requirementId, {
      uploading: true,
      uploadError: undefined,
      file_name: file.name,
      file_url: "",
    });

    try {
      const blob = await upload(`registrations/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
      });
      updateUpload(requirementId, {
        uploading: false,
        file_name: file.name,
        file_url: blob.url,
      });
    } catch (error) {
      updateUpload(requirementId, {
        uploading: false,
        file_name: "",
        file_url: "",
        uploadError:
          error instanceof Error ? error.message : "Upload failed. Try again.",
      });
    }
  }

  function renderFileRequirement(requirement: DocumentRequirement) {
    const state = project.uploads[requirement.id] ?? emptyUpload();
    const inputId = id(`documents.${requirement.id}`);
    const label = requirement.required
      ? requirement.name
      : `${requirement.name} (optional)`;
    return (
      <Field
        key={requirement.id}
        id={inputId}
        label={label}
        error={state.uploadError || errors[`documents.${requirement.id}`]}
      >
        <FilePicker
          id={inputId}
          accept={acceptAttrForFormats(requirement.accepted_formats)}
          disabled={disabled}
          uploading={Boolean(state.uploading)}
          fileName={state.file_url || state.uploading ? state.file_name : ""}
          onFile={(file) => void handleDocumentUpload(requirement.id, file)}
          onRemove={
            state.file_url && !state.uploading
              ? () => updateUpload(requirement.id, emptyUpload())
              : undefined
          }
          variant="marketing"
        />
        <p className={mutedTextClassName}>
          Accepted: {formatLabels(requirement.accepted_formats)} (up to 100 MB).
        </p>
      </Field>
    );
  }

  function renderLinkRequirement(requirement: DocumentRequirement) {
    const inputId = id(`documents.${requirement.id}`);
    const label = requirement.required
      ? requirement.name
      : `${requirement.name} (optional)`;
    const value = project.links[requirement.id] ?? "";
    return (
      <Field
        key={requirement.id}
        id={inputId}
        label={label}
        error={errors[`documents.${requirement.id}`]}
      >
        <input
          id={inputId}
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => updateLink(requirement.id, e.target.value)}
          placeholder="https://youtube.com/… or https://drive.google.com/…"
          className={inputClassName}
          aria-invalid={Boolean(errors[`documents.${requirement.id}`])}
          aria-describedby={id(`documents.${requirement.id}.hint`)}
          disabled={disabled}
        />
        <p
          id={id(`documents.${requirement.id}.hint`)}
          className={mutedTextClassName}
        >
          Paste a {formatLabels(requirement.accepted_formats)} link. Make sure
          it is set to public (on Google Drive, &ldquo;Anyone with the
          link&rdquo;) so the judges can open it.
        </p>
      </Field>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Section title="Category" description="Choose the category this project is entering.">
        <Field id={id("category_id")} label="Category" error={errors.category_id}>
          <select
            id={id("category_id")}
            value={project.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            className={inputClassName}
            aria-invalid={Boolean(errors.category_id)}
            disabled={levelCategories.length === 0}
          >
            {levelCategories.length === 0 ? (
              <option value="">No categories available</option>
            ) : (
              levelCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </Field>
      </Section>

      <Section
        title="Participant"
        description="The main contact for this project. No account is created."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={id("participant.name")} label="Full name" error={errors["participant.name"]}>
            <input
              id={id("participant.name")}
              type="text"
              autoComplete="name"
              value={project.participantName}
              onChange={(e) => set("participantName", e.target.value)}
              className={inputClassName}
              aria-invalid={Boolean(errors["participant.name"])}
            />
          </Field>
          <Field id={id("participant.email")} label="Email" error={errors["participant.email"]}>
            <input
              id={id("participant.email")}
              type="email"
              autoComplete="email"
              value={project.participantEmail}
              onChange={(e) => set("participantEmail", e.target.value)}
              className={inputClassName}
              aria-invalid={Boolean(errors["participant.email"])}
            />
          </Field>
          <Field id={id("participant.phone")} label="Phone" error={errors["participant.phone"]}>
            <div className="flex gap-2">
              <select
                aria-label="Country code"
                value={project.phoneCode}
                onChange={(e) => set("phoneCode", e.target.value)}
                className={`${inputClassName} max-w-24`}
              >
                {DIAL_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <input
                id={id("participant.phone")}
                type="tel"
                autoComplete="tel-national"
                value={project.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="12 345 6789"
                className={inputClassName}
                aria-invalid={Boolean(errors["participant.phone"])}
              />
            </div>
          </Field>
          <Field
            id={id("participant.education_level")}
            label="Education level"
            error={errors["participant.education_level"]}
          >
            <select
              id={id("participant.education_level")}
              value={project.educationLevel}
              onChange={(e) =>
                setEducationLevel(e.target.value as EducationLevel)
              }
              className={inputClassName}
              disabled={
                educationLevelLocked || educationLevels.length < 2
              }
            >
              {educationLevels.map((level) => (
                <option key={level} value={level}>
                  {EDUCATION_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id={id("participant.government_id.type")}
            label="ID type"
            error={errors["participant.government_id.type"]}
          >
            <select
              id={id("participant.government_id.type")}
              value={project.govIdType}
              onChange={(e) => set("govIdType", e.target.value as IdType)}
              className={inputClassName}
            >
              <option value="NATIONAL_ID">National ID</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVING_LICENSE">Driving license</option>
            </select>
          </Field>
          <Field
            id={id("participant.government_id.number")}
            label="ID number"
            error={errors["participant.government_id.number"]}
          >
            <input
              id={id("participant.government_id.number")}
              type="text"
              value={project.govIdNumber}
              onChange={(e) => set("govIdNumber", e.target.value)}
              className={inputClassName}
              aria-invalid={Boolean(errors["participant.government_id.number"])}
            />
          </Field>
        </div>
      </Section>

      <Section title="Project" description="Describe the project you are submitting.">
        <Field id={id("project.title")} label="Project title" error={errors["project.title"]}>
          <input
            id={id("project.title")}
            type="text"
            value={project.projectTitle}
            onChange={(e) => set("projectTitle", e.target.value)}
            className={inputClassName}
            aria-invalid={Boolean(errors["project.title"])}
          />
        </Field>
        <Field id={id("project.abstract")} label="Abstract" error={errors["project.abstract"]}>
          <textarea
            id={id("project.abstract")}
            value={project.projectAbstract}
            onChange={(e) => set("projectAbstract", e.target.value)}
            className={textareaClassName}
            aria-invalid={Boolean(errors["project.abstract"])}
          />
        </Field>
      </Section>

      <Section
        title="Team/s"
        description="Name the team lead and any additional members. Defaults to the participant if left blank."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={id("team.lead.name")} label="Lead name" error={errors["team.lead.name"]}>
            <input
              id={id("team.lead.name")}
              type="text"
              value={project.leadName}
              onChange={(e) => set("leadName", e.target.value)}
              placeholder={project.participantName || "Same as participant"}
              className={inputClassName}
              aria-invalid={Boolean(errors["team.lead.name"])}
            />
          </Field>
          <Field id={id("team.lead.email")} label="Lead email" error={errors["team.lead.email"]}>
            <input
              id={id("team.lead.email")}
              type="email"
              value={project.leadEmail}
              onChange={(e) => set("leadEmail", e.target.value)}
              placeholder={project.participantEmail || "Same as participant"}
              className={inputClassName}
              aria-invalid={Boolean(errors["team.lead.email"])}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Team members{" "}
              <span className={`font-normal ${mutedTextClassName}`}>
                ({project.members.length}/{MAX_TEAM_MEMBERS})
              </span>
            </p>
            <button
              type="button"
              onClick={() =>
                updatePeople("members", (prev) =>
                  prev.length >= MAX_TEAM_MEMBERS
                    ? prev
                    : [...prev, { name: "", email: "" }]
                )
              }
              disabled={project.members.length >= MAX_TEAM_MEMBERS}
              className={linkButtonClassName}
            >
              Add member
            </button>
          </div>
          <p className="text-sm leading-relaxed">
            <span className="font-bold tracking-wide text-[#e8b84a]">
              GROUP REGISTRATION OFFER
            </span>
            {" — register five (5) entries and enjoy the sixth (6th) entry FREE!"}
          </p>
          {project.members.length >= MAX_TEAM_MEMBERS ? (
            <p className={mutedTextClassName}>
              You&apos;ve reached the maximum of {MAX_TEAM_MEMBERS} team members.
            </p>
          ) : null}
          <FieldError message={errors["team.members"]} />
          {project.members.length === 0 ? (
            <p className={mutedTextClassName}>No additional members yet.</p>
          ) : (
            project.members.map((member, memberIndex) => (
              <div key={memberIndex} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="text"
                  aria-label={`Member ${memberIndex + 1} name`}
                  placeholder="Name"
                  value={member.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    updatePeople("members", (prev) =>
                      prev.map((m, i) => (i === memberIndex ? { ...m, name: value } : m))
                    );
                  }}
                  className={inputClassName}
                />
                <input
                  type="email"
                  aria-label={`Member ${memberIndex + 1} email`}
                  placeholder="Email"
                  value={member.email}
                  onChange={(e) => {
                    const value = e.target.value;
                    updatePeople("members", (prev) =>
                      prev.map((m, i) => (i === memberIndex ? { ...m, email: value } : m))
                    );
                  }}
                  className={inputClassName}
                />
                <button
                  type="button"
                  onClick={() =>
                    updatePeople("members", (prev) =>
                      prev.filter((_, i) => i !== memberIndex)
                    )
                  }
                  className={`h-11 ${mutedTextClassName} underline-offset-4 hover:underline`}
                >
                  Remove
                </button>
                <FieldError message={errors[`team.members.${memberIndex}.name`]} />
                <FieldError message={errors[`team.members.${memberIndex}.email`]} />
              </div>
            ))
          )}
        </div>
      </Section>

      <Section
        title="Supervisors"
        description="List academic or project supervisors for this project."
      >
        <div className="flex flex-col gap-3">
          {project.supervisors.map((supervisor, supIndex) => (
            <div key={supIndex} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  aria-label={`Supervisor ${supIndex + 1} name`}
                  placeholder="Name"
                  value={supervisor.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    updatePeople("supervisors", (prev) =>
                      prev.map((s, i) => (i === supIndex ? { ...s, name: value } : s))
                    );
                  }}
                  className={inputClassName}
                />
                <FieldError message={errors[`supervisors.${supIndex}.name`]} />
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  type="email"
                  aria-label={`Supervisor ${supIndex + 1} email`}
                  placeholder="Email"
                  value={supervisor.email}
                  onChange={(e) => {
                    const value = e.target.value;
                    updatePeople("supervisors", (prev) =>
                      prev.map((s, i) => (i === supIndex ? { ...s, email: value } : s))
                    );
                  }}
                  className={inputClassName}
                />
                <FieldError message={errors[`supervisors.${supIndex}.email`]} />
              </div>
              <button
                type="button"
                onClick={() =>
                  updatePeople("supervisors", (prev) =>
                    prev.length === 1
                      ? [{ name: "", email: "" }]
                      : prev.filter((_, i) => i !== supIndex)
                  )
                }
                className={`h-11 ${mutedTextClassName} underline-offset-4 hover:underline`}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updatePeople("supervisors", (prev) => [...prev, { name: "", email: "" }])
            }
            className={`self-start ${linkButtonClassName}`}
          >
            Add supervisor
          </button>
        </div>
      </Section>

      <Section
        title="Documents"
        description={
          beforePayment.length > 0
            ? `Upload the required files for the ${EDUCATION_LEVEL_LABELS[project.educationLevel].toLowerCase()} stream.`
            : afterPayment.length > 0
              ? "These documents are requested after payment is confirmed."
              : "No documents are required for this stream."
        }
      >
        {beforePayment.length === 0 ? (
          <p className={mutedTextClassName}>
            {afterPayment.length > 0
              ? "Nothing to upload now. The secretariat will email a link for the remaining documents after payment is confirmed."
              : "This competition has no document uploads configured for your education level."}
          </p>
        ) : (
          beforePayment.map((requirement) =>
            requirement.input_type === "LINK"
              ? renderLinkRequirement(requirement)
              : renderFileRequirement(requirement)
          )
        )}
      </Section>
    </div>
  );
}
