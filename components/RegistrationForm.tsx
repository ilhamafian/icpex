"use client";

import { upload } from "@vercel/blob/client";
import { FormEvent, useState } from "react";
import { IconChevronDown, IconTrash } from "@tabler/icons-react";

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
  fileInputClassName,
  inputClassName,
  linkButtonClassName,
  mutedTextClassName,
  Section,
} from "@/components/registrationFormUi";
import type { EducationLevel } from "@/schemas/educationLevel";
import {
  FREE_PROJECT_EVERY,
  MAX_PROJECTS_PER_SUBMISSION,
} from "@/schemas/registrationSchema";
import {
  institutionSchema,
  submissionFormSchema,
  type SubmissionForm,
} from "@/schemas/submissionSchema";

type Option = { id: string; name: string };

type FieldErrors = Record<string, string>;

type FormStep = "university" | "projects" | "payment";

type Quote = { fees: number[]; freeCount: number; total: number };

type SubmissionResult = {
  submission_number: string;
  total: number;
  projects: { registration_number: string; title: string; fee: number }[];
};

/** Manual bank transfer — placeholder details for participants. */
const PAYMENT_BANK = {
  bankName: "Maybank",
  accountName: "ICPEX Competition Secretariat",
  accountNumber: "512345678901",
} as const;

const STEPS: { id: FormStep; label: string }[] = [
  { id: "university", label: "1. University" },
  { id: "projects", label: "2. Projects" },
  { id: "payment", label: "3. Payment" },
];

function formatMyr(amount: number) {
  return `MYR ${amount.toFixed(2)}`;
}

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
  categories: Option[];
};

export function RegistrationForm({
  competitionId,
  educationLevels,
  initialEducationLevel,
  categories = [],
}: RegistrationFormProps) {
  const defaultLevel =
    initialEducationLevel ?? educationLevels[0] ?? "UNDERGRADUATE";
  const newProject = () => emptyProject(categories[0]?.id ?? "", defaultLevel);

  const [step, setStep] = useState<FormStep>("university");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionCountry, setInstitutionCountry] = useState("");
  const [projects, setProjects] = useState<ProjectState[]>(() => [newProject()]);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(projects.map((p) => p.key))
  );

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState<string>();

  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const anyUploading = projects.some(projectIsUploading);
  const institution = { name: institutionName, country: institutionCountry };

  function buildPayload(): SubmissionForm {
    return {
      competition_id: competitionId,
      institution,
      projects: projects.map(projectToPayload),
      receipt_url: quote && quote.total > 0 ? receiptUrl : undefined,
    };
  }

  function updateProject(
    key: string,
    update: (project: ProjectState) => ProjectState
  ) {
    setProjects((prev) => prev.map((p) => (p.key === key ? update(p) : p)));
  }

  function toggleProject(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addProject() {
    if (projects.length >= MAX_PROJECTS_PER_SUBMISSION) return;
    const project = newProject();
    setProjects((prev) => [...prev, project]);
    setExpanded((prev) => new Set(prev).add(project.key));
  }

  function removeProject(key: string) {
    setProjects((prev) => prev.filter((p) => p.key !== key));
    setErrors({});
  }

  function validateUniversity(): boolean {
    const parsed = institutionSchema.safeParse(institution);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          Object.entries(issuesToErrors(parsed.error.issues)).map(
            ([key, message]) => [`institution.${key}`, message]
          )
        )
      );
      return false;
    }
    setErrors({});
    return true;
  }

  function validateProjects(): boolean {
    const parsed = submissionFormSchema.safeParse({
      ...buildPayload(),
      receipt_url: undefined,
    });
    if (!parsed.success) {
      const next = issuesToErrors(parsed.error.issues);
      setErrors(next);
      setExpanded((prev) => {
        const open = new Set(prev);
        projects.forEach((p, index) => {
          if (Object.keys(projectErrors(next, index)).length) open.add(p.key);
        });
        return open;
      });
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

  async function handleReceiptUpload(file: File | undefined) {
    if (!file) return;

    setReceiptUploading(true);
    setReceiptUploadError(undefined);
    setReceiptFileName(file.name);
    setReceiptUrl("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next.receipt_url;
      return next;
    });

    try {
      const blob = await upload(`payments/receipts/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
      });
      setReceiptUrl(blob.url);
    } catch (error) {
      setReceiptUploadError(
        error instanceof Error ? error.message : "Upload failed. Try again."
      );
    } finally {
      setReceiptUploading(false);
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
    if (receiptUploading) {
      setErrors({ form: "Please wait for the receipt upload to finish." });
      return;
    }
    if (quote.total > 0 && !receiptUrl) {
      setErrors({ receipt_url: "Please upload your payment receipt." });
      return;
    }

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
            .{" "}
            {result.total > 0
              ? "Your payment receipt is pending verification."
              : "No payment was required for this submission."}{" "}
            Keep these numbers for your records.
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-black/10 text-sm dark:divide-white/10">
          {result.projects.map((project) => (
            <li
              key={project.registration_number}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{project.title}</p>
                <p className={mutedTextClassName}>
                  {project.registration_number}
                </p>
              </div>
              <span className="shrink-0 font-medium">
                {project.fee === 0 ? "Free" : formatMyr(project.fee)}
              </span>
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
          description={`All projects in this submission are entered under one university. Every ${FREE_PROJECT_EVERY}th project from the same university is free, so use your university's full official name to have your projects counted together.`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="institution.name"
              label="University"
              error={errors["institution.name"]}
            >
              <input
                id="institution.name"
                type="text"
                autoComplete="organization"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. Universiti Malaya"
                className={inputClassName}
                aria-invalid={Boolean(errors["institution.name"])}
              />
            </Field>
            <Field
              id="institution.country"
              label="Country"
              error={errors["institution.country"]}
            >
              <input
                id="institution.country"
                type="text"
                autoComplete="country-name"
                value={institutionCountry}
                onChange={(e) => setInstitutionCountry(e.target.value)}
                className={inputClassName}
                aria-invalid={Boolean(errors["institution.country"])}
              />
            </Field>
          </div>
        </Section>
      ) : null}

      {step === "projects" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Projects{" "}
                <span className={`font-normal ${mutedTextClassName}`}>
                  ({projects.length}/{MAX_PROJECTS_PER_SUBMISSION})
                </span>
              </h2>
              <p className={`mt-1 ${mutedTextClassName}`}>
                Add up to {MAX_PROJECTS_PER_SUBMISSION} projects from{" "}
                <span className="font-medium text-foreground">
                  {institutionName}
                </span>
                . Each project has its own participant, team, supervisors and
                documents.
              </p>
            </div>
            <button
              type="button"
              onClick={addProject}
              disabled={projects.length >= MAX_PROJECTS_PER_SUBMISSION}
              className={`shrink-0 ${linkButtonClassName}`}
            >
              Add project
            </button>
          </div>
          <FieldError message={errors.projects} />

          {projects.map((project, index) => {
            const isOpen = expanded.has(project.key);
            const scopedErrors = projectErrors(errors, index);
            const hasErrors = Object.keys(scopedErrors).length > 0;
            const category = categories.find((c) => c.id === project.categoryId);
            return (
              <div
                key={project.key}
                className={`rounded-lg border ${
                  hasErrors
                    ? "border-red-600/50 dark:border-red-400/50"
                    : "border-black/10 dark:border-white/10"
                }`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleProject(project.key)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <IconChevronDown
                      className={`size-4 shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        Project {index + 1}
                        {project.projectTitle ? ` — ${project.projectTitle}` : ""}
                      </span>
                      <span className={`block truncate ${mutedTextClassName}`}>
                        {[category?.name, project.participantName]
                          .filter(Boolean)
                          .join(" · ") || "Not started"}
                        {hasErrors ? " · needs attention" : ""}
                      </span>
                    </span>
                  </button>
                  {projects.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeProject(project.key)}
                      aria-label={`Remove project ${index + 1}`}
                      className={`shrink-0 p-1 ${mutedTextClassName} hover:text-foreground`}
                    >
                      <IconTrash className="size-4" />
                    </button>
                  ) : null}
                </div>
                {isOpen ? (
                  <div className="border-t border-black/10 px-4 py-6 dark:border-white/10">
                    <ProjectFields
                      index={index}
                      project={project}
                      onChange={(update) => updateProject(project.key, update)}
                      errors={scopedErrors}
                      categories={categories}
                      educationLevels={educationLevels}
                      disabled={loading}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {step === "payment" ? (
        <Section
          title="Payment"
          description="Review your fee, transfer it using the bank details below, then upload your receipt."
        >
          <div className="flex flex-col gap-3 rounded-lg border border-black/10 px-4 py-5 dark:border-white/10">
            <p className="text-sm font-medium">
              {institutionName} · {projects.length} project
              {projects.length === 1 ? "" : "s"}
            </p>
            {quoteLoading ? (
              <p className={mutedTextClassName}>Calculating fee…</p>
            ) : quote ? (
              <>
                <ul className="flex flex-col divide-y divide-black/10 text-sm dark:divide-white/10">
                  {projects.map((project, index) => (
                    <li
                      key={project.key}
                      className="flex items-center justify-between gap-4 py-2"
                    >
                      <span className="min-w-0 truncate">
                        Project {index + 1}: {project.projectTitle}
                      </span>
                      <span className="shrink-0 font-medium">
                        {quote.fees[index] === 0
                          ? `Free (${FREE_PROJECT_EVERY}th project)`
                          : formatMyr(quote.fees[index])}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-black/10 pt-3 text-sm font-semibold dark:border-white/10">
                  <span>Total</span>
                  <span>{formatMyr(quote.total)}</span>
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
            <>
              <div className="flex flex-col gap-4 rounded-lg border border-black/10 px-4 py-5 dark:border-white/10">
                <p className="text-sm font-medium">Manual bank transfer</p>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className={mutedTextClassName}>Bank</dt>
                    <dd className="mt-0.5 font-medium">{PAYMENT_BANK.bankName}</dd>
                  </div>
                  <div>
                    <dt className={mutedTextClassName}>Account name</dt>
                    <dd className="mt-0.5 font-medium">{PAYMENT_BANK.accountName}</dd>
                  </div>
                  <div>
                    <dt className={mutedTextClassName}>Account number</dt>
                    <dd className="mt-0.5 font-medium tracking-wide">
                      {PAYMENT_BANK.accountNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className={mutedTextClassName}>Amount</dt>
                    <dd className="mt-0.5 font-medium">{formatMyr(quote.total)}</dd>
                  </div>
                </dl>
                <p className={mutedTextClassName}>
                  Use your university name as the transfer reference so we can
                  match your payment.
                </p>
              </div>

              <Field
                id="receipt_url"
                label="Upload payment receipt"
                error={receiptUploadError || errors.receipt_url}
              >
                <input
                  id="receipt_url"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                  disabled={receiptUploading || loading}
                  onChange={(e) => {
                    void handleReceiptUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                  className={fileInputClassName}
                />
                {receiptUploading ? (
                  <p className={mutedTextClassName}>Uploading…</p>
                ) : null}
                {receiptUrl && !receiptUploading ? (
                  <p className={`truncate ${mutedTextClassName}`}>
                    Uploaded: {receiptFileName}
                  </p>
                ) : null}
              </Field>
            </>
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
            (step === "payment" && (receiptUploading || quoteLoading || !quote)) ||
            !competitionId ||
            categories.length === 0
          }
          className="h-11 flex-1 rounded-full bg-foreground text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc] sm:flex-none sm:px-10"
        >
          {loading
            ? "Submitting…"
            : step === "payment"
              ? receiptUploading
                ? "Uploading receipt…"
                : "Submit registration"
              : step === "projects" && anyUploading
                ? "Uploading documents…"
                : "Next"}
        </button>
      </div>
    </form>
  );
}
