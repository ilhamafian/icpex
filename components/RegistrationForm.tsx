"use client";

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
  inputClassName,
  linkButtonClassName,
  mutedTextClassName,
  Section,
} from "@/components/registrationFormUi";
import type { EducationLevel } from "@/schemas/educationLevel";
import { FREE_PROJECT_EVERY } from "@/schemas/registrationSchema";
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
import { formatMoney, type Currency } from "@/utils/registrationFee";

type Option = { id: string; name: string };

type FieldErrors = Record<string, string>;

type FormStep = "university" | "projects" | "payment";

type Quote = {
  currency: Currency;
  fees: number[];
  freeCount: number;
  total: number;
};

type SubmissionResult = {
  submission_number: string;
  total: number;
  currency: Currency;
  projects: { registration_number: string; title: string; fee: number }[];
};

const STEPS: { id: FormStep; label: string }[] = [
  { id: "university", label: "1. University" },
  { id: "projects", label: "2. Project" },
  { id: "payment", label: "3. Payment" },
];

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
  /** Preselected from the landing page's level-specific registration link. */
  initialEducationLevel?: EducationLevel;
  /** When set from ?level=, education level cannot be changed on the form. */
  educationLevelLocked?: boolean;
  categories: Option[];
};

export function RegistrationForm({
  competitionId,
  educationLevels,
  initialEducationLevel,
  educationLevelLocked = false,
  categories = [],
}: RegistrationFormProps) {
  const defaultLevel =
    initialEducationLevel ?? educationLevels[0] ?? "UNDERGRADUATE";
  const newProject = () => emptyProject(categories[0]?.id ?? "", defaultLevel);

  const [step, setStep] = useState<FormStep>("university");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionCountry, setInstitutionCountry] = useState("");
  const [institutionType, setInstitutionType] = useState<
    MalaysiaInstitutionType | ""
  >("");
  const [projects, setProjects] = useState<ProjectState[]>(() => [newProject()]);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

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
      projects: projects.map(projectToPayload),
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
    setErrors({});
    return true;
  }

  async function loadQuote() {
    setQuoteLoading(true);
    setQuote(null);
    try {
      const params = new URLSearchParams({
        institution: institutionName,
        country: institutionCountry,
        count: String(projects.length),
      });
      const response = await fetch(`/api/submissions/quote?${params}`);
      const data = await response.json();
      if (!response.ok) {
        setErrors({
          form:
            typeof data.error === "string"
              ? data.error
              : "Could not calculate the registration fee.",
        });
        return;
      }
      setQuote(data.quote as Quote);
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setQuoteLoading(false);
    }
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

    if (step === "projects") {
      if (validateProjects()) {
        goTo("payment");
        void loadQuote();
      }
      return;
    }

    if (!quote) return;

    const parsed = submissionFormSchema.safeParse(buildPayload());
    if (!parsed.success) {
      goTo("projects");
      validateProjects();
      return;
    }

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
      <div className="flex flex-col gap-6 rounded-lg border border-black/10 px-5 py-6 dark:border-white/10">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Registration submitted
          </h2>
          <p className={`mt-1 ${mutedTextClassName}`}>
            Your submission number is{" "}
            <span className="font-medium text-foreground">
              {result.submission_number}
            </span>
            . The secretariat will follow up after reviewing your submission.
            Keep these numbers for your records.
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-black/10 text-sm dark:divide-white/10">
          {result.projects.map((item) => (
            <li key={item.registration_number} className="py-2.5">
              <p className="truncate font-medium">{item.title}</p>
              <p className={mutedTextClassName}>{item.registration_number}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
      <div className={`flex flex-wrap items-center gap-3 ${mutedTextClassName}`}>
        {STEPS.map((s, index) => (
          <span key={s.id} className="flex items-center gap-3">
            {index > 0 ? <span aria-hidden="true">→</span> : null}
            <span
              className={
                index === stepIndex ? "font-medium text-foreground" : undefined
              }
            >
              {s.label}
            </span>
          </span>
        ))}
      </div>

      {step === "university" ? (
        <Section
          title="University"
          description={`Enter your university details. Every ${FREE_PROJECT_EVERY}th project from the same university is free across separate submissions, so use your university's full official name each time.`}
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
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Project</h2>
            <p className={`mt-1 ${mutedTextClassName}`}>
              Enter your project details for{" "}
              <span className="font-medium text-foreground">
                {institutionName}
              </span>
              , including participant, team, supervisors and documents.
            </p>
          </div>
          <FieldError message={errors.projects} />
          <ProjectFields
            index={0}
            project={project}
            onChange={updateProject}
            errors={projectErrors(errors, 0)}
            categories={categories}
            educationLevels={educationLevels}
            educationLevelLocked={educationLevelLocked}
            disabled={loading}
          />
        </div>
      ) : null}

      {step === "payment" ? (
        <Section
          title="Payment"
          description={`Review your registration fee. Every ${FREE_PROJECT_EVERY}th project from the same university is free.`}
        >
          <div className="flex flex-col gap-3 rounded-lg border border-black/10 px-4 py-5 dark:border-white/10">
            <p className="text-sm font-medium">
              {institutionName} · {project?.projectTitle || "Your project"}
            </p>
            {quoteLoading ? (
              <p className={mutedTextClassName}>Calculating fee…</p>
            ) : quote ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>Registration fee</span>
                  <span className="font-medium">
                    {quote.fees[0] === 0
                      ? `Free (${FREE_PROJECT_EVERY}th project)`
                      : formatMoney(quote.fees[0], quote.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-black/10 pt-3 text-sm font-semibold dark:border-white/10">
                  <span>Total</span>
                  <span>{formatMoney(quote.total, quote.currency)}</span>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void loadQuote()}
                className={`self-start ${linkButtonClassName}`}
              >
                Retry fee calculation
              </button>
            )}
          </div>

          {quote && quote.total > 0 ? (
            <p className={mutedTextClassName}>
              Don&apos;t pay yet. Once the secretariat has reviewed your
              submission, they will email you the payment instructions.
            </p>
          ) : quote ? (
            <p className={mutedTextClassName}>
              No payment is needed for this submission — just submit to finish.
            </p>
          ) : null}
        </Section>
      ) : null}

      <FieldError message={errors.form} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {step !== "university" ? (
          <button
            type="button"
            onClick={() => goTo(step === "payment" ? "projects" : "university")}
            disabled={loading}
            className="h-11 rounded-full border border-black/10 px-6 text-sm font-medium text-foreground transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5"
          >
            Back
          </button>
        ) : null}
        <button
          type="submit"
          disabled={
            loading ||
            (step === "projects" && anyUploading) ||
            (step === "payment" && (quoteLoading || !quote)) ||
            !competitionId ||
            categories.length === 0
          }
          className="h-11 flex-1 rounded-full bg-foreground text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc] sm:flex-none sm:px-10"
        >
          {loading
            ? "Submitting…"
            : step === "payment"
              ? "Submit registration"
              : step === "projects" && anyUploading
                ? "Uploading documents…"
                : "Next"}
        </button>
      </div>
    </form>
  );
}
