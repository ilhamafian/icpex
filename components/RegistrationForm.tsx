"use client";

import { IconCheck } from "@tabler/icons-react";
import { FormEvent, useState } from "react";

import {
  emptyProject,
  ProjectFields,
  projectIsUploading,
  projectToPayload,
  type ProjectState,
} from "@/components/ProjectFields";
import { cardGlassClass, cardGlassStyle } from "@/components/marketing/blocks";
import {
  Field,
  FieldError,
  inputClassName,
  mutedTextClassName,
  Section,
} from "@/components/marketing/registrationFormUi";
import { LiquidGlass } from "@/components/ui/liquid-glass";
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
};

export function RegistrationForm({
  competitionId,
  educationLevels,
  documentRequirements,
  initialEducationLevel,
  educationLevelLocked = false,
  categories = [],
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

  const [step, setStep] = useState<FormStep>("university");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionCountry, setInstitutionCountry] = useState("");
  const [institutionType, setInstitutionType] = useState<
    MalaysiaInstitutionType | ""
  >("");
  const [projects, setProjects] = useState<ProjectState[]>(() => [newProject()]);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const project = projects[0];
  const anyUploading = projects.some(projectIsUploading);
  const institution = { name: institutionName, country: institutionCountry };
  const isMalaysia = institutionCountry === MALAYSIA;

  function changeCountry(country: string) {
    setInstitutionCountry(country);
    setInstitutionType("");
    setInstitutionName("");
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
    if (isMalaysia && !institutionType) {
      next["institution.type"] = "Institution type is required.";
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

    if (step === "university") {
      if (validateUniversity()) goTo("projects");
      return;
    }

    if (!validateProjects()) return;

    const parsed = submissionFormSchema.safeParse(buildPayload());
    if (!parsed.success) return;

    setErrors({});
    setLoading(true);
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
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
      <LiquidGlass
        tint={0}
        radius={28}
        className={cardGlassClass}
        style={cardGlassStyle}
        contentClassName="px-6 py-8 sm:px-8"
      >
        <p className="text-xs font-semibold tracking-[0.2em] text-[#e8b84a] uppercase">
          Submitted
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">Registration submitted</h2>
        <p className={`mt-3 ${mutedTextClassName}`}>
          Your submission number is{" "}
          <span className="font-semibold text-white">{result.submission_number}</span>
          . The secretariat will follow up after reviewing your submission. Keep these
          numbers for your records.
        </p>
        <ul className="mt-6 flex flex-col divide-y divide-white/10 text-sm">
          {result.projects.map((item) => (
            <li key={item.registration_number} className="py-3">
              <p className="truncate font-semibold text-white">{item.title}</p>
              <p className={mutedTextClassName}>{item.registration_number}</p>
            </li>
          ))}
        </ul>
      </LiquidGlass>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-8"
      style={{ colorScheme: "dark" }}
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
                    : "flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/55"
                }
              >
                {done ? <IconCheck className="size-4" stroke={2.5} aria-hidden /> : index + 1}
              </span>
              <span
                className={
                  active
                    ? "text-sm font-bold text-white"
                    : "text-sm font-semibold text-white/55"
                }
              >
                {s.label}
              </span>
            </>
          );

          return (
            <li key={s.id} aria-current={active ? "step" : undefined}>
              {done ? (
                <LiquidGlass
                  as="button"
                  type="button"
                  onClick={() => goTo(s.id)}
                  tint={0}
                  radius={20}
                  className={`${cardGlassClass} w-full text-left transition-transform duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100`}
                  style={cardGlassStyle}
                  contentClassName="flex items-center gap-3 px-4 py-3"
                >
                  {marker}
                </LiquidGlass>
              ) : (
                <LiquidGlass
                  tint={0}
                  radius={20}
                  className={`${cardGlassClass} w-full`}
                  style={cardGlassStyle}
                  contentClassName="flex items-center gap-3 px-4 py-3"
                >
                  {marker}
                </LiquidGlass>
              )}
            </li>
          );
        })}
      </ol>

      {step === "university" ? (
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
                className={inputClassName}
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
                  className={inputClassName}
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
                <select
                  id="institution.name"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className={inputClassName}
                  aria-invalid={Boolean(errors["institution.name"])}
                  disabled={!institutionType}
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
                </select>
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
                  className={inputClassName}
                  aria-invalid={Boolean(errors["institution.name"])}
                  disabled={!institutionCountry}
                />
              )}
            </Field>
          </div>
        </Section>
      ) : null}

      {step === "projects" && project ? (
        <div className="flex flex-col gap-8">
          <p className={mutedTextClassName}>
            Enter your project details for{" "}
            <span className="font-semibold text-white">{institutionName}</span>, including
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
        </div>
      ) : null}

      <FieldError message={errors.form} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {step !== "university" ? (
          <LiquidGlass
            as="button"
            type="button"
            onClick={() => goTo("university")}
            disabled={loading}
            tint={0}
            className={`${cardGlassClass} text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:scale-100`}
            style={cardGlassStyle}
            contentClassName="flex h-12 items-center justify-center px-7 text-sm font-bold tracking-wide"
          >
            Back
          </LiquidGlass>
        ) : null}
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
            ? "Submitting…"
            : step === "projects" && anyUploading
              ? "Uploading documents…"
              : step === "projects"
                ? "Submit registration"
                : "Next"}
        </button>
      </div>
    </form>
  );
}
