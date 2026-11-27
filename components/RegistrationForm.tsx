"use client";

import { IconCheck } from "@tabler/icons-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import {
  emptyProject,
  ProjectFields,
  projectIsUploading,
  projectToPayload,
  type ProjectState,
} from "@/components/ProjectFields";
import {
  Field,
  FieldError,
  mutedTextClassName,
  paperCardClassName,
  paperInputClassName,
  Section,
} from "@/components/marketing/registrationFormUi";
import {
  requirementsForLevel,
  requirementsForTiming,
  validateDocumentsAgainstRequirements,
  type DocumentRequirement,
} from "@/schemas/documentRequirement";
import type { EducationLevel } from "@/schemas/educationLevel";
import {
  institutionSchema,
  submissionFormSchema,
  type SubmissionForm,
} from "@/schemas/submissionSchema";
import {
  COUNTRIES,
  MALAYSIA,
  MALAYSIA_INSTITUTION_TYPES,
  MALAYSIA_UNIVERSITIES,
  type MalaysiaInstitutionType,
} from "@/utils/institutions";

type Option = {
  id: string;
  name: string;
  educationLevel?: EducationLevel;
};

type FieldErrors = Record<string, string>;

type FormStep = "university" | "projects";

type SubmissionResult = {
  submission_number: string;
  projects: { registration_number: string; title: string }[];
};

const STEPS: { id: FormStep; label: string }[] = [
  { id: "university", label: "University" },
  { id: "projects", label: "Project" },
];

/** Select value for a Malaysian university that is not on the official list. */
const OTHER_UNIVERSITY = "__other__";

function listedMalaysiaType(name: string): MalaysiaInstitutionType | "" {
  for (const type of MALAYSIA_INSTITUTION_TYPES) {
    if (MALAYSIA_UNIVERSITIES[type].includes(name)) return type;
  }
  return "";
}

const primaryButtonClassName =
  "inline-flex h-12 w-full items-center justify-center rounded-full bg-[#d6a11e] px-8 text-sm font-bold tracking-wide text-[#1a1408] transition-colors hover:bg-[#e2b43a] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const next: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    next[key] ??= issue.message;
  }
  return next;
}

/** Errors under `projects.<index>.`, with that prefix removed. */
function projectErrors(errors: FieldErrors, index: number): FieldErrors {
  const prefix = `projects.${index}.`;
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, message]) => [key.slice(prefix.length), message])
  );
}

type RegistrationFormProps = {
  /** Active published competition — only one is open at a time. */
  competitionId: string;
  /** Education levels the competition accepts. */
  educationLevels: EducationLevel[];
  /** Document uploads configured on the competition (per education stream). */
  documentRequirements: DocumentRequirement[];
  /** Preselected from the landing page's level-specific registration link. */
  initialEducationLevel?: EducationLevel;
  /** When set from ?level=, education level cannot be changed on the form. */
  educationLevelLocked?: boolean;
  categories: Option[];
  mode?: "create" | "edit";
  submissionId?: string;
  /** Paid submissions stay visible but cannot be changed. */
  readOnly?: boolean;
  initialInstitution?: { name: string; country: string };
  initialProject?: ProjectState;
};

export function RegistrationForm({
  competitionId,
  educationLevels,
  documentRequirements,
  initialEducationLevel,
  educationLevelLocked = false,
  categories = [],
  mode = "create",
  submissionId,
  readOnly = false,
  initialInstitution,
  initialProject,
}: RegistrationFormProps) {
  const defaultLevel =
    initialEducationLevel ?? educationLevels[0] ?? "UNDERGRADUATE";
  const categoryForLevel = (level: EducationLevel) =>
    categories.find(
      (category) =>
        !category.educationLevel || category.educationLevel === level
    )?.id ??
    categories[0]?.id ??
    "";
  const newProject = () => emptyProject(categoryForLevel(defaultLevel), defaultLevel);
  const startingCountry = initialInstitution?.country ?? "";
  const startingName = initialInstitution?.name ?? "";
  const startingType =
    startingCountry === MALAYSIA ? listedMalaysiaType(startingName) : "";

  const [step, setStep] = useState<FormStep>("university");
  const [institutionName, setInstitutionName] = useState(() => {
    if (startingCountry !== MALAYSIA) return startingName;
    if (!startingName) return "";
    return startingType ? startingName : OTHER_UNIVERSITY;
  });
  const [otherUniversityName, setOtherUniversityName] = useState(() =>
    startingCountry === MALAYSIA && startingName && !startingType ? startingName : ""
  );
  const [institutionCountry, setInstitutionCountry] = useState(startingCountry);
  const [institutionType, setInstitutionType] = useState<
    MalaysiaInstitutionType | ""
  >(startingType);
  const [projects, setProjects] = useState<ProjectState[]>(() => [
    initialProject ?? newProject(),
  ]);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const project = projects[0];
  const anyUploading = projects.some(projectIsUploading);
  const isMalaysia = institutionCountry === MALAYSIA;
  const choosingOther = isMalaysia && institutionName === OTHER_UNIVERSITY;
  const resolvedInstitutionName = choosingOther
    ? otherUniversityName.trim()
    : institutionName.trim();
  const institution = {
    name: resolvedInstitutionName,
    country: institutionCountry,
  };
  const shownInstitutionName = resolvedInstitutionName || "your university";

  function changeCountry(country: string) {
    setInstitutionCountry(country);
    setInstitutionType("");
    setInstitutionName("");
    setOtherUniversityName("");
  }

  function changeInstitutionType(type: MalaysiaInstitutionType | "") {
    setInstitutionType(type);
    setInstitutionName("");
  }

  function buildPayload(): SubmissionForm {
    return {
      competition_id: competitionId,
      institution,
      projects: projects.map((item) =>
        projectToPayload(item, documentRequirements)
      ),
    };
  }

  function updateProject(update: (project: ProjectState) => ProjectState) {
    setProjects((prev) => prev.map((p, i) => (i === 0 ? update(p) : p)));
  }

  function validateUniversity(): boolean {
    const parsed = institutionSchema.safeParse(institution);
    const next: FieldErrors = parsed.success
      ? {}
      : Object.fromEntries(
          Object.entries(issuesToErrors(parsed.error.issues)).map(
            ([key, message]) => [`institution.${key}`, message]
          )
        );
    if (isMalaysia && !choosingOther && !institutionType) {
      next["institution.type"] = "Institution type is required.";
    }
    if (choosingOther && !otherUniversityName.trim()) {
      next["institution.name"] = "Enter your university's full official name.";
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return false;
    }
    setErrors({});
    return true;
  }

  function validateProjects(): boolean {
    const parsed = submissionFormSchema.safeParse(buildPayload());
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return false;
    }
    if (anyUploading) {
      setErrors({ form: "Please wait for document uploads to finish." });
      return false;
    }

    const documentErrors: FieldErrors = {};
    for (const [index, item] of projects.entries()) {
      const levelDocs = requirementsForTiming(
        requirementsForLevel(documentRequirements, item.educationLevel),
        "BEFORE_PAYMENT"
      );
      const payloadDocs = projectToPayload(item, documentRequirements).documents;
      const next = validateDocumentsAgainstRequirements(payloadDocs, levelDocs);
      for (const [key, message] of Object.entries(next)) {
        documentErrors[`projects.${index}.${key}`] = message;
      }
    }
    if (Object.keys(documentErrors).length) {
      setErrors(documentErrors);
      return false;
    }

    setErrors({});
    return true;
  }

  function goTo(next: FormStep) {
    setErrors({});
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (readOnly) {
      if (step === "university") goTo("projects");
      return;
    }

    if (step === "university") {
      if (validateUniversity()) goTo("projects");
      return;
    }

    if (!validateProjects()) return;

    const parsed = submissionFormSchema.safeParse(buildPayload());
    if (!parsed.success) return;

    setErrors({});
    setLoading(true);
    const endpoint =
      mode === "edit" && submissionId
        ? `/api/my/submissions/${submissionId}`
        : "/api/submissions";
    try {
      const response = await fetch(endpoint, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({
          form:
            typeof data.error === "string"
              ? data.error
              : "Could not submit registration. Please check your details and try again.",
        });
        return;
      }
      setResult(data.submission as SubmissionResult);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className={`${paperCardClassName} px-6 py-8 sm:px-8`}>
        <p className="text-xs font-semibold tracking-[0.2em] text-[#8a6410] uppercase">
          Submitted
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">
          {mode === "edit" ? "Changes saved" : "Registration submitted"}
        </h2>
        <p className={`mt-3 ${mutedTextClassName}`}>
          Your submission number is{" "}
          <span className="font-semibold text-[#10243c]">{result.submission_number}</span>
          . The secretariat will follow up after reviewing your submission. Keep these
          numbers for your records.
        </p>
        <ul className="mt-6 flex flex-col divide-y divide-[#d5e1ec] text-sm">
          {result.projects.map((item) => (
            <li key={item.registration_number} className="py-3">
              <p className="truncate font-semibold text-[#10243c]">{item.title}</p>
              <p className={mutedTextClassName}>{item.registration_number}</p>
            </li>
          ))}
        </ul>
        <Link
          href="/"
          className="mt-6 inline-flex text-sm font-semibold text-[#8a6410] underline-offset-2 hover:underline"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-8"
      style={{ colorScheme: "light" }}
      noValidate
    >
      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, index) => {
          const active = index === stepIndex;
          const done = index < stepIndex;
          const marker = (
            <>
              <span
                className={
                  active || done
                    ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8b84a] text-sm font-bold text-[#1a1408]"
                    : "flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e6edf4] text-sm font-bold text-[#5c6e82]"
                }
              >
                {done ? <IconCheck className="size-4" stroke={2.5} aria-hidden /> : index + 1}
              </span>
              <span
                className={
                  active
                    ? "text-sm font-bold text-[#10243c]"
                    : "text-sm font-semibold text-[#5c6e82]"
                }
              >
                {s.label}
              </span>
            </>
          );

          return (
            <li key={s.id} aria-current={active ? "step" : undefined}>
              {done ? (
                <button
                  type="button"
                  onClick={() => goTo(s.id)}
                  className={`${paperCardClassName} flex w-full items-center gap-3 px-4 py-3 text-left transition-transform duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100`}
                >
                  {marker}
                </button>
              ) : (
                <div className={`${paperCardClassName} flex w-full items-center gap-3 px-4 py-3`}>
                  {marker}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {step === "university" ? (
        <fieldset disabled={readOnly} className="min-w-0 border-0 p-0">
        <Section
          title="University"
          description="Enter your university details. Use your university's full official name."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="institution.country"
              label="Country"
              error={errors["institution.country"]}
            >
              <select
                id="institution.country"
                autoComplete="country-name"
                value={institutionCountry}
                onChange={(e) => changeCountry(e.target.value)}
                className={paperInputClassName}
                aria-invalid={Boolean(errors["institution.country"])}
              >
                <option value="" disabled>
                  Select a country
                </option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </Field>
            {isMalaysia ? (
              <Field
                id="institution.type"
                label="Institution type"
                error={errors["institution.type"]}
              >
                <select
                  id="institution.type"
                  value={institutionType}
                  onChange={(e) =>
                    changeInstitutionType(
                      e.target.value as MalaysiaInstitutionType | ""
                    )
                  }
                  className={paperInputClassName}
                  aria-invalid={Boolean(errors["institution.type"])}
                >
                  <option value="" disabled>
                    Select an institution type
                  </option>
                  {MALAYSIA_INSTITUTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field
              id="institution.name"
              label="University"
              error={errors["institution.name"]}
            >
              {isMalaysia ? (
                <>
                  <select
                    id="institution.name"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className={paperInputClassName}
                    aria-invalid={Boolean(errors["institution.name"])}
                    disabled={!institutionType && !choosingOther}
                  >
                    <option value="" disabled>
                      {institutionType
                        ? "Select a university"
                        : "Select an institution type first"}
                    </option>
                    {institutionType
                      ? MALAYSIA_UNIVERSITIES[institutionType].map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))
                      : null}
                    <option value={OTHER_UNIVERSITY}>Other</option>
                  </select>
                  {choosingOther ? (
                    <input
                      id="institution.other"
                      type="text"
                      autoComplete="organization"
                      value={otherUniversityName}
                      onChange={(e) => setOtherUniversityName(e.target.value)}
                      placeholder="Full official university name"
                      className={`${paperInputClassName} mt-3`}
                      aria-invalid={Boolean(errors["institution.name"])}
                    />
                  ) : null}
                </>
              ) : (
                <input
                  id="institution.name"
                  type="text"
                  autoComplete="organization"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder={
                    institutionCountry
                      ? "Full official university name"
                      : "Select a country first"
                  }
                  className={paperInputClassName}
                  aria-invalid={Boolean(errors["institution.name"])}
                  disabled={!institutionCountry}
                />
              )}
            </Field>
          </div>
        </Section>
        </fieldset>
      ) : null}

      {readOnly ? (
        <p className="rounded-2xl border border-[#e8b84a]/50 bg-[#f8f1dc] px-4 py-3 text-sm text-[#10243c]">
          This submission is paid, so the details can no longer be edited. Payment status
          stays available from My submissions.
        </p>
      ) : null}

      {step === "projects" && project ? (
        <fieldset
          disabled={readOnly || loading}
          className="flex min-w-0 flex-col gap-8 border-0 p-0"
        >
          <p className={mutedTextClassName}>
            Enter your project details for{" "}
            <span className="font-semibold text-[#10243c]">{shownInstitutionName}</span>, including
            participant, team, supervisors and documents.
          </p>
          <FieldError message={errors.projects} />
          <ProjectFields
            index={0}
            project={project}
            onChange={updateProject}
            errors={projectErrors(errors, 0)}
            categories={categories}
            educationLevels={educationLevels}
            documentRequirements={documentRequirements}
            educationLevelLocked={educationLevelLocked}
            disabled={loading}
          />
        </fieldset>
      ) : null}

      <FieldError message={errors.form} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {step !== "university" ? (
          <button
            type="button"
            onClick={() => goTo("university")}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#d5e1ec] bg-white px-7 text-sm font-bold tracking-wide text-[#10243c] transition-colors hover:bg-[#f3f6f9] disabled:opacity-60"
          >
            Back
          </button>
        ) : null}
        {readOnly && step === "projects" ? null : (
          <button
            type="submit"
            disabled={
              loading ||
              (step === "projects" && anyUploading) ||
              !competitionId ||
              categories.length === 0
            }
            className={primaryButtonClassName}
          >
            {loading
              ? "Saving…"
              : step === "projects" && anyUploading
                ? "Uploading documents…"
                : step === "projects"
                  ? mode === "edit"
                    ? "Save changes"
                    : "Submit registration"
                  : "Next"}
          </button>
        )}
      </div>
    </form>
  );
}
