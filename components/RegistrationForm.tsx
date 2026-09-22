"use client";

import { upload } from "@vercel/blob/client";
import { FormEvent, useState } from "react";
import { z } from "zod";
import {
  registrationFormSchema,
  type RegistrationForm,
} from "@/schemas/registrationSchema";

type Option = { id: string; name: string };

type FieldErrors = Record<string, string>;

type Person = { name: string; email: string };

type FormStep = "details" | "payment";

type DocumentRow = {
  type: RegistrationForm["documents"][number]["type"];
  file_name: string;
  file_url: string;
  uploading?: boolean;
  uploadError?: string;
};

const EDUCATION_LEVELS = [
  "DIPLOMA",
  "UNDERGRADUATE",
  "GRADUATE",
  "PHD",
] as const;

const ID_TYPES = ["PASSPORT", "NATIONAL_ID", "DRIVING_LICENSE"] as const;

const DOCUMENT_TYPES = [
  "PROJECT_REPORT",
  "PROJECT_PRESENTATION",
  "PROJECT_DEMO",
  "PROJECT_VIDEO",
  "PROJECT_PHOTO",
  "PROJECT_OTHER",
] as const;

/** Manual bank transfer — placeholder details for participants. */
const REGISTRATION_FEE = 150;
const PAYMENT_BANK = {
  bankName: "Maybank",
  accountName: "ICPEX Competition Secretariat",
  accountNumber: "512345678901",
} as const;

const inputClassName =
  "h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none transition-colors focus:border-foreground dark:border-white/15";

const textareaClassName =
  "min-h-28 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2.5 text-sm outline-none transition-colors focus:border-foreground dark:border-white/15";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-black/10 pt-8 first:border-t-0 first:pt-0 dark:border-white/10">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

type RegistrationFormProps = {
  /** Active published competition — only one is open at a time. */
  competitionId: string;
  categories: Option[];
};

export function RegistrationForm({
  competitionId,
  categories = [],
}: RegistrationFormProps) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");

  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [educationLevel, setEducationLevel] =
    useState<(typeof EDUCATION_LEVELS)[number]>("UNDERGRADUATE");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionCountry, setInstitutionCountry] = useState("");
  const [govIdType, setGovIdType] =
    useState<(typeof ID_TYPES)[number]>("NATIONAL_ID");
  const [govIdNumber, setGovIdNumber] = useState("");

  const [projectTitle, setProjectTitle] = useState("");
  const [projectAbstract, setProjectAbstract] = useState("");

  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [members, setMembers] = useState<Person[]>([]);
  const [supervisors, setSupervisors] = useState<Person[]>([
    { name: "", email: "" },
  ]);
  const [documents, setDocuments] = useState<DocumentRow[]>([
    { type: "PROJECT_REPORT", file_name: "", file_url: "" },
  ]);

  const [step, setStep] = useState<FormStep>("details");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState<string>();

  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(
    null
  );

  function buildRegistrationPayload(): RegistrationForm {
    return {
      competition_id: competitionId,
      category_id: categoryId,
      participant: {
        name: participantName,
        email: participantEmail,
        phone,
        education_level: educationLevel,
        institution: {
          name: institutionName,
          country: institutionCountry,
        },
        government_id: {
          type: govIdType,
          number: govIdNumber,
        },
      },
      project: {
        title: projectTitle,
        abstract: projectAbstract,
      },
      team: {
        lead: {
          name: leadName || participantName,
          email: leadEmail || participantEmail,
        },
        members: members.filter((m) => m.name.trim() || m.email.trim()),
      },
      supervisors: supervisors.filter((s) => s.name.trim() || s.email.trim()),
      documents: documents.filter(
        (d) => d.file_name.trim() || d.file_url.trim()
      ),
    };
  }

  function validateDetails(): boolean {
    const parsed = registrationFormSchema.safeParse(buildRegistrationPayload());
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        next[key] ??= issue.message;
      }
      setErrors(next);
      return false;
    }

    if (documents.some((d) => d.uploading)) {
      setErrors({ form: "Please wait for document uploads to finish." });
      return false;
    }

    setErrors({});
    return true;
  }

  async function handleDocumentUpload(index: number, file: File | undefined) {
    if (!file) return;

    setDocuments((prev) =>
      prev.map((d, i) =>
        i === index
          ? {
              ...d,
              uploading: true,
              uploadError: undefined,
              file_name: file.name,
              file_url: "",
            }
          : d
      )
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`documents.${index}.file_url`];
      delete next[`documents.${index}.file_name`];
      return next;
    });

    try {
      const blob = await upload(`registrations/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
      });

      setDocuments((prev) =>
        prev.map((d, i) =>
          i === index
            ? {
                ...d,
                uploading: false,
                uploadError: undefined,
                file_name: file.name,
                file_url: blob.url,
              }
            : d
        )
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed. Try again.";
      setDocuments((prev) =>
        prev.map((d, i) =>
          i === index
            ? {
                ...d,
                uploading: false,
                uploadError: message,
                file_url: "",
              }
            : d
        )
      );
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
      setReceiptFileName(file.name);
      setReceiptUploadError(undefined);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed. Try again.";
      setReceiptUrl("");
      setReceiptUploadError(message);
    } finally {
      setReceiptUploading(false);
    }
  }

  function handleNext() {
    if (!validateDetails()) return;
    setStep("payment");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step === "details") {
      handleNext();
      return;
    }

    const registrationParsed = registrationFormSchema.safeParse(
      buildRegistrationPayload()
    );
    if (!registrationParsed.success) {
      setStep("details");
      validateDetails();
      return;
    }

    if (receiptUploading) {
      setErrors({ form: "Please wait for the receipt upload to finish." });
      return;
    }

    const receiptCheck = z
      .string()
      .url()
      .safeParse(receiptUrl);
    if (!receiptCheck.success) {
      setErrors({
        receipt_url: receiptUrl
          ? "Receipt URL is invalid. Please upload again."
          : "Please upload your payment receipt.",
      });
      setSubmitted(false);
      setRegistrationNumber(null);
      return;
    }

    setErrors({});
    setLoading(true);
    setSubmitted(false);
    setRegistrationNumber(null);

    try {
      const registrationResponse = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationParsed.data),
      });
      const registrationData = await registrationResponse.json();

      if (!registrationResponse.ok) {
        setErrors({
          form:
            typeof registrationData.error === "string"
              ? registrationData.error
              : "Could not submit registration. Please check your details and try again.",
        });
        setStep("details");
        return;
      }

      const registrationId = registrationData.registration?._id as
        | string
        | undefined;
      const number =
        (registrationData.registration?.registration_number as
          | string
          | undefined) ?? null;

      if (!registrationId) {
        setErrors({
          form: "Registration was created but no ID was returned. Please contact support.",
        });
        setRegistrationNumber(number);
        return;
      }

      const paymentResponse = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          amount: REGISTRATION_FEE,
          receipt_url: receiptUrl,
        }),
      });
      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        setRegistrationNumber(number);
        setErrors({
          form:
            typeof paymentData.error === "string"
              ? `${paymentData.error} Your registration number is ${number ?? "unavailable"} — please contact support to complete payment.`
              : `Registration was saved${number ? ` (${number})` : ""}, but payment could not be recorded. Please contact support.`,
        });
        return;
      }

      setRegistrationNumber(number);
      setSubmitted(true);
    } catch {
      setErrors({
        form: "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
      <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <span
          className={
            step === "details" ? "font-medium text-foreground" : undefined
          }
        >
          1. Details
        </span>
        <span aria-hidden="true">→</span>
        <span
          className={
            step === "payment" ? "font-medium text-foreground" : undefined
          }
        >
          2. Payment
        </span>
      </div>

      {step === "details" ? (
        <>
      <Section
        title="Category"
        description="Choose the category you are entering."
      >
        <input type="hidden" name="competition_id" value={competitionId} />
        <Field
          id="category_id"
          label="Category"
          error={errors.category_id}
        >
          <select
            id="category_id"
            name="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
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
        <FieldError message={errors.competition_id} />
      </Section>

      <Section
        title="Participant"
        description="Your details are stored with this registration only — no account is created."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="participant.name" label="Full name" error={errors["participant.name"]}>
            <input
              id="participant.name"
              type="text"
              autoComplete="name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className={inputClassName}
              aria-invalid={Boolean(errors["participant.name"])}
            />
          </Field>
          <Field
            id="participant.email"
            label="Email"
            error={errors["participant.email"]}
          >
            <input
              id="participant.email"
              type="email"
              autoComplete="email"
              value={participantEmail}
              onChange={(e) => setParticipantEmail(e.target.value)}
              className={inputClassName}
              aria-invalid={Boolean(errors["participant.email"])}
            />
          </Field>
          <Field id="participant.phone" label="Phone" error={errors["participant.phone"]}>
            <input
              id="participant.phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClassName}
              aria-invalid={Boolean(errors["participant.phone"])}
            />
          </Field>
          <Field
            id="participant.education_level"
            label="Education level"
            error={errors["participant.education_level"]}
          >
            <select
              id="participant.education_level"
              value={educationLevel}
              onChange={(e) =>
                setEducationLevel(
                  e.target.value as (typeof EDUCATION_LEVELS)[number]
                )
              }
              className={inputClassName}
            >
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0) + level.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="participant.institution.name"
            label="Institution"
            error={errors["participant.institution.name"]}
          >
            <input
              id="participant.institution.name"
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              className={inputClassName}
              aria-invalid={Boolean(errors["participant.institution.name"])}
            />
          </Field>
          <Field
            id="participant.institution.country"
            label="Country"
            error={errors["participant.institution.country"]}
          >
            <input
              id="participant.institution.country"
              type="text"
              autoComplete="country-name"
              value={institutionCountry}
              onChange={(e) => setInstitutionCountry(e.target.value)}
              className={inputClassName}
              aria-invalid={Boolean(errors["participant.institution.country"])}
            />
          </Field>
          <Field
            id="participant.government_id.type"
            label="ID type"
            error={errors["participant.government_id.type"]}
          >
            <select
              id="participant.government_id.type"
              value={govIdType}
              onChange={(e) =>
                setGovIdType(e.target.value as (typeof ID_TYPES)[number])
              }
              className={inputClassName}
            >
              <option value="NATIONAL_ID">National ID</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVING_LICENSE">Driving license</option>
            </select>
          </Field>
          <Field
            id="participant.government_id.number"
            label="ID number"
            error={errors["participant.government_id.number"]}
          >
            <input
              id="participant.government_id.number"
              type="text"
              value={govIdNumber}
              onChange={(e) => setGovIdNumber(e.target.value)}
              className={inputClassName}
              aria-invalid={Boolean(errors["participant.government_id.number"])}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Project"
        description="Describe the project you are submitting for this competition."
      >
        <Field id="project.title" label="Project title" error={errors["project.title"]}>
          <input
            id="project.title"
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className={inputClassName}
            aria-invalid={Boolean(errors["project.title"])}
          />
        </Field>
        <Field
          id="project.abstract"
          label="Abstract"
          error={errors["project.abstract"]}
        >
          <textarea
            id="project.abstract"
            value={projectAbstract}
            onChange={(e) => setProjectAbstract(e.target.value)}
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
          <Field id="team.lead.name" label="Lead name" error={errors["team.lead.name"]}>
            <input
              id="team.lead.name"
              type="text"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              placeholder={participantName || "Same as participant"}
              className={inputClassName}
              aria-invalid={Boolean(errors["team.lead.name"])}
            />
          </Field>
          <Field
            id="team.lead.email"
            label="Lead email"
            error={errors["team.lead.email"]}
          >
            <input
              id="team.lead.email"
              type="email"
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              placeholder={participantEmail || "Same as participant"}
              className={inputClassName}
              aria-invalid={Boolean(errors["team.lead.email"])}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Team members</p>
            <button
              type="button"
              onClick={() =>
                setMembers((prev) => [...prev, { name: "", email: "" }])
              }
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Add member
            </button>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No additional members yet.
            </p>
          ) : (
            members.map((member, index) => (
              <div
                key={index}
                className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  type="text"
                  aria-label={`Member ${index + 1} name`}
                  placeholder="Name"
                  value={member.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMembers((prev) =>
                      prev.map((m, i) =>
                        i === index ? { ...m, name: value } : m
                      )
                    );
                  }}
                  className={inputClassName}
                />
                <input
                  type="email"
                  aria-label={`Member ${index + 1} email`}
                  placeholder="Email"
                  value={member.email}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMembers((prev) =>
                      prev.map((m, i) =>
                        i === index ? { ...m, email: value } : m
                      )
                    );
                  }}
                  className={inputClassName}
                />
                <button
                  type="button"
                  onClick={() =>
                    setMembers((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="h-11 text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
                >
                  Remove
                </button>
                <FieldError message={errors[`team.members.${index}.name`]} />
                <FieldError message={errors[`team.members.${index}.email`]} />
              </div>
            ))
          )}
        </div>
      </Section>

      <Section
        title="Supervisors"
        description="List academic or project supervisors for this submission."
      >
        <div className="flex flex-col gap-3">
          {supervisors.map((supervisor, index) => (
            <div
              key={index}
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  aria-label={`Supervisor ${index + 1} name`}
                  placeholder="Name"
                  value={supervisor.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSupervisors((prev) =>
                      prev.map((s, i) =>
                        i === index ? { ...s, name: value } : s
                      )
                    );
                  }}
                  className={inputClassName}
                />
                <FieldError message={errors[`supervisors.${index}.name`]} />
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  type="email"
                  aria-label={`Supervisor ${index + 1} email`}
                  placeholder="Email"
                  value={supervisor.email}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSupervisors((prev) =>
                      prev.map((s, i) =>
                        i === index ? { ...s, email: value } : s
                      )
                    );
                  }}
                  className={inputClassName}
                />
                <FieldError message={errors[`supervisors.${index}.email`]} />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSupervisors((prev) =>
                    prev.length === 1
                      ? [{ name: "", email: "" }]
                      : prev.filter((_, i) => i !== index)
                  )
                }
                className="h-11 text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setSupervisors((prev) => [...prev, { name: "", email: "" }])
            }
            className="self-start text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Add supervisor
          </button>
        </div>
      </Section>

      <Section
        title="Documents"
        description="Upload project documents (PDF, Office, images, video, or zip — up to 100 MB each)."
      >
        <div className="flex flex-col gap-3">
          {documents.map((doc, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <select
                aria-label={`Document ${index + 1} type`}
                value={doc.type}
                onChange={(e) => {
                  const value = e.target
                    .value as DocumentRow["type"];
                  setDocuments((prev) =>
                    prev.map((d, i) =>
                      i === index ? { ...d, type: value } : d
                    )
                  );
                }}
                className={inputClassName}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type
                      .replace(/^PROJECT_/, "")
                      .replaceAll("_", " ")
                      .toLowerCase()
                      .replace(/^\w/, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
              <div className="flex min-w-0 flex-col gap-1.5">
                <input
                  type="file"
                  aria-label={`Document ${index + 1} file`}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,image/*,video/mp4,video/webm,video/quicktime"
                  disabled={doc.uploading || loading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    void handleDocumentUpload(index, file);
                    e.target.value = "";
                  }}
                  className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-black/10 file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground dark:text-zinc-400 dark:file:border-white/15"
                />
                {doc.uploading ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Uploading…
                  </p>
                ) : null}
                {doc.file_url && !doc.uploading ? (
                  <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                    Uploaded: {doc.file_name}
                  </p>
                ) : null}
                <FieldError
                  message={
                    doc.uploadError ||
                    errors[`documents.${index}.file_name`] ||
                    errors[`documents.${index}.file_url`]
                  }
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setDocuments((prev) =>
                    prev.length === 1
                      ? [
                          {
                            type: "PROJECT_REPORT",
                            file_name: "",
                            file_url: "",
                          },
                        ]
                      : prev.filter((_, i) => i !== index)
                  )
                }
                className="h-11 shrink-0 text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setDocuments((prev) => [
                ...prev,
                { type: "PROJECT_REPORT", file_name: "", file_url: "" },
              ])
            }
            className="self-start text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Add document
          </button>
        </div>
      </Section>
        </>
      ) : (
        <Section
          title="Payment"
          description="Transfer the registration fee using the bank details below, then upload your receipt."
        >
          <div className="flex flex-col gap-4 rounded-lg border border-black/10 px-4 py-5 dark:border-white/10">
            <p className="text-sm font-medium text-foreground">
              Manual bank transfer
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-600 dark:text-zinc-400">Bank</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {PAYMENT_BANK.bankName}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-600 dark:text-zinc-400">
                  Account name
                </dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {PAYMENT_BANK.accountName}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-600 dark:text-zinc-400">
                  Account number
                </dt>
                <dd className="mt-0.5 font-medium tracking-wide text-foreground">
                  {PAYMENT_BANK.accountNumber}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-600 dark:text-zinc-400">Amount</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  MYR {REGISTRATION_FEE.toFixed(2)}
                </dd>
              </div>
            </dl>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Use your participant name as the transfer reference so we can
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
              disabled={receiptUploading || loading || submitted}
              onChange={(e) => {
                const file = e.target.files?.[0];
                void handleReceiptUpload(file);
                e.target.value = "";
              }}
              className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-black/10 file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground dark:text-zinc-400 dark:file:border-white/15"
            />
            {receiptUploading ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Uploading…
              </p>
            ) : null}
            {receiptUrl && !receiptUploading ? (
              <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                Uploaded: {receiptFileName}
              </p>
            ) : null}
          </Field>
        </Section>
      )}

      {errors.form ? <FieldError message={errors.form} /> : null}

      {submitted ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Registration submitted
          {registrationNumber ? (
            <>
              {" "}
              — your registration number is{" "}
              <span className="font-medium text-foreground">
                {registrationNumber}
              </span>
            </>
          ) : null}
          . Your payment receipt is pending verification. Keep your registration
          number for your records.
        </p>
      ) : null}

      {!submitted ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {step === "payment" ? (
            <button
              type="button"
              onClick={() => {
                setStep("details");
                setErrors({});
              }}
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
              (step === "details" && documents.some((d) => d.uploading)) ||
              (step === "payment" && receiptUploading) ||
              !competitionId ||
              categories.length === 0
            }
            className="h-11 flex-1 rounded-full bg-foreground text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc] sm:flex-none sm:px-10"
          >
            {loading
              ? "Submitting…"
              : step === "details"
                ? documents.some((d) => d.uploading)
                  ? "Uploading documents…"
                  : "Next"
                : receiptUploading
                  ? "Uploading receipt…"
                  : "Submit registration"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
