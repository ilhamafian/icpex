"use client";

import { upload } from "@vercel/blob/client";
import {
  EDUCATION_LEVEL_LABELS,
  type EducationLevel,
} from "@/schemas/educationLevel";
import { MAX_TEAM_MEMBERS } from "@/schemas/registrationSchema";
import type { SubmissionProject } from "@/schemas/submissionSchema";
import {
  Field,
  FieldError,
  fileInputClassName,
  inputClassName,
  linkButtonClassName,
  mutedTextClassName,
  Section,
  textareaClassName,
} from "@/components/registrationFormUi";
import { DEFAULT_PHONE_CODE, DIAL_CODES } from "@/utils/phoneCodes";

type Option = { id: string; name: string };
type Person = { name: string; email: string };
type IdType = SubmissionProject["participant"]["government_id"]["type"];
export type UploadState = {
  file_name: string;
  file_url: string;
  uploading?: boolean;
  uploadError?: string;
};

type UploadKey = "abstract" | "fullPaper";

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
  abstract: UploadState;
  fullPaper: UploadState;
  videoLink: string;
};

const DOCUMENT_ACCEPT = ".pdf,.doc,.docx";

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
    abstract: emptyUpload(),
    fullPaper: emptyUpload(),
    videoLink: "",
  };
}

function projectDocuments(project: ProjectState): SubmissionProject["documents"] {
  const documents: SubmissionProject["documents"] = [];
  if (project.abstract.file_url) {
    documents.push({
      type: "ABSTRACT",
      file_name: project.abstract.file_name,
      file_url: project.abstract.file_url,
    });
  }
  if (project.fullPaper.file_url) {
    documents.push({
      type: "FULL_PAPER",
      file_name: project.fullPaper.file_name,
      file_url: project.fullPaper.file_url,
    });
  }
  const videoLink = project.videoLink.trim();
  if (videoLink) {
    documents.push({ type: "VIDEO_LINK", file_name: "Video link", file_url: videoLink });
  }
  return documents;
}

export function projectToPayload(project: ProjectState): SubmissionProject {
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
    documents: projectDocuments(project),
  };
}

export function projectIsUploading(project: ProjectState) {
  return Boolean(project.abstract.uploading || project.fullPaper.uploading);
}

type ProjectFieldsProps = {
  index: number;
  project: ProjectState;
  onChange: (update: (project: ProjectState) => ProjectState) => void;
  /** Errors for this project, keyed by path relative to the project. */
  errors: Record<string, string>;
  categories: Option[];
  educationLevels: EducationLevel[];
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
  educationLevelLocked,
  disabled,
}: ProjectFieldsProps) {
  const id = (path: string) => `projects.${index}.${path}`;

  function set<K extends keyof ProjectState>(key: K, value: ProjectState[K]) {
    onChange((current) => ({ ...current, [key]: value }));
  }

  function updatePeople(
    key: "members" | "supervisors",
    update: (people: Person[]) => Person[]
  ) {
    onChange((current) => ({ ...current, [key]: update(current[key]) }));
  }

  function updateUpload(key: UploadKey, patch: Partial<UploadState>) {
    onChange((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }

  async function handleDocumentUpload(key: UploadKey, file: File | undefined) {
    if (!file) return;
    updateUpload(key, {
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
      updateUpload(key, {
        uploading: false,
        file_name: file.name,
        file_url: blob.url,
      });
    } catch (error) {
      updateUpload(key, {
        uploading: false,
        file_url: "",
        uploadError:
          error instanceof Error ? error.message : "Upload failed. Try again.",
      });
    }
  }

  function renderUpload(key: UploadKey, label: string, error?: string) {
    const state = project[key];
    const inputId = id(`documents.${key}`);
    return (
      <Field id={inputId} label={label} error={state.uploadError || error}>
        <div className="flex items-center gap-3">
          <input
            id={inputId}
            type="file"
            accept={DOCUMENT_ACCEPT}
            disabled={state.uploading || disabled}
            onChange={(e) => {
              void handleDocumentUpload(key, e.target.files?.[0]);
              e.target.value = "";
            }}
            className={fileInputClassName}
          />
          {state.file_url && !state.uploading ? (
            <button
              type="button"
              onClick={() => set(key, emptyUpload())}
              className={`shrink-0 ${mutedTextClassName} underline-offset-4 hover:underline`}
            >
              Remove
            </button>
          ) : null}
        </div>
        {state.uploading ? <p className={mutedTextClassName}>Uploading…</p> : null}
        {state.file_url && !state.uploading ? (
          <p className={`truncate ${mutedTextClassName}`}>
            Uploaded: {state.file_name}
          </p>
        ) : null}
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
            disabled={categories.length === 0}
          >
            {categories.length === 0 ? (
              <option value="">No categories available</option>
            ) : (
              categories.map((c) => (
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
                set("educationLevel", e.target.value as EducationLevel)
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
        title="Team"
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
        description="Upload your abstract and, optionally, your full paper (PDF or Word, up to 100 MB each), and share a link to your project video."
      >
        {renderUpload("abstract", "Abstract", errors["documents.abstract"])}
        {renderUpload("fullPaper", "Full paper (optional)", errors["documents.full_paper"])}
        <Field
          id={id("documents.video_link")}
          label="Video link"
          error={errors["documents.video_link"]}
        >
          <input
            id={id("documents.video_link")}
            type="url"
            inputMode="url"
            value={project.videoLink}
            onChange={(e) => set("videoLink", e.target.value)}
            placeholder="https://youtube.com/… or https://drive.google.com/…"
            className={inputClassName}
            aria-invalid={Boolean(errors["documents.video_link"])}
            aria-describedby={id("documents.video_link.hint")}
          />
          <p id={id("documents.video_link.hint")} className={mutedTextClassName}>
            Paste a Google Drive or YouTube link. Make sure the video is set to
            public (on Google Drive, &ldquo;Anyone with the link&rdquo;) so the
            judges can watch it.
          </p>
        </Field>
      </Section>
    </div>
  );
}
