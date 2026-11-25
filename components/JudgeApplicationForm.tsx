"use client";

import { upload } from "@vercel/blob/client";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { FilePicker } from "@/components/FilePicker";
import { inputClassName } from "@/components/marketing/registrationFormUi";
import {
  JURY_DECLARATION,
  REVIEWER_DECLARATION,
} from "@/components/marketing/content";
import { Checkbox } from "@/components/ui/checkbox";
import {
  EDUCATION_LEVEL_LABELS,
  type EducationLevel,
} from "@/schemas/educationLevel";
import {
  APPLICANT_TITLES,
  judgeApplicationFormSchema,
  type JudgeApplicationKind,
} from "@/schemas/judgeApplicationSchema";
import {
  COUNTRIES,
  MALAYSIA,
  MALAYSIA_INSTITUTION_TYPES,
  MALAYSIA_UNIVERSITIES,
  type MalaysiaInstitutionType,
} from "@/utils/institutions";

export type JuryCategoryOption = {
  id: string;
  name: string;
  educationLevel: EducationLevel;
};

const selectClassName = inputClassName;
const textareaClassName =
  "min-h-28 w-full rounded-xl border border-white/15 bg-[#07111d]/55 px-3 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] outline-none transition-colors placeholder:text-white/35 focus:border-[#e8b84a] focus:ring-2 focus:ring-[#e8b84a]/30";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function JudgeApplicationForm({
  tracks,
  lockedTrack,
  categories,
}: {
  tracks: EducationLevel[];
  lockedTrack: boolean;
  categories: JuryCategoryOption[];
}) {
  const [kind, setKind] = useState<JudgeApplicationKind>("JUDGE");
  const [level, setLevel] = useState<EducationLevel>(tracks[0] ?? "UNDERGRADUATE");
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("");
  const [institutionType, setInstitutionType] = useState<
    MalaysiaInstitutionType | ""
  >("");
  const [institutionName, setInstitutionName] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [expertise, setExpertise] = useState("");
  const [experience, setExperience] = useState("");
  const [cv, setCv] = useState({ fileName: "", fileUrl: "", uploading: false });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const isMalaysia = country === MALAYSIA;
  const visibleCategories = useMemo(
    () => categories.filter((category) => category.educationLevel === level),
    [categories, level]
  );
  const declaration = kind === "JUDGE" ? JURY_DECLARATION : REVIEWER_DECLARATION;

  function changeCountry(next: string) {
    setCountry(next);
    setInstitutionType("");
    setInstitutionName("");
  }

  function changeLevel(next: EducationLevel) {
    setLevel(next);
    setCategoryIds([]);
  }

  async function handleCv(file: File | undefined) {
    if (!file) return;
    setFormError(null);
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      setFormError("Upload a PDF or Word CV.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError("CV must be 10 MB or smaller.");
      return;
    }
    setCv({ fileName: file.name, fileUrl: "", uploading: true });
    try {
      const blob = await upload(`judge-applications/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
      });
      setCv({ fileName: file.name, fileUrl: blob.url, uploading: false });
    } catch (error) {
      setCv({ fileName: "", fileUrl: "", uploading: false });
      setFormError(error instanceof Error ? error.message : "Upload failed. Try again.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (cv.uploading) {
      setFormError("Please wait for the CV upload to finish.");
      return;
    }
    if (password !== confirm) {
      setErrors({ password: "Passwords do not match." });
      return;
    }

    const parsed = judgeApplicationFormSchema.safeParse({
      kind,
      education_level: level,
      title,
      name,
      email,
      password,
      institution: { name: institutionName, country },
      address,
      postcode,
      phone,
      national_id: nationalId,
      category_ids: categoryIds,
      field_of_expertise: expertise,
      jury_experience: experience,
      cv_url: cv.fileUrl || "https://example.com/missing",
      cv_file_name: cv.fileName || "missing",
      declaration_accepted: accepted,
    });

    if (!cv.fileUrl) {
      const next = parsed.success ? {} : issuesToErrors(parsed.error.issues);
      next.cv_file_name = "Upload your CV.";
      setErrors(next);
      return;
    }

    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return;
    }

    setErrors({});
    setPending(true);
    try {
      const res = await fetch("/api/judge-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
      if (!res.ok) {
        setFormError(
          typeof data?.error === "string"
            ? data.error
            : "Could not submit your application."
        );
        return;
      }
      setDone(true);
    } catch {
      setFormError("Could not submit your application.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold">Application received</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
          Thank you. A confirmation email is on its way. If you are appointed, you
          will receive an official letter and can then sign in with the password
          you chose.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">I am applying as</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["JUDGE", "Judge"],
              ["REVIEWER", "Paper reviewer"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium ${
                kind === value
                  ? "border-[#e8b84a] bg-[#e8b84a] text-[#1a1408]"
                  : "border-white/20 text-white"
              }`}
            >
              <input
                type="radio"
                name="application-kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {tracks.length > 1 && !lockedTrack ? (
        <Field id="application-track" label="Track" error={errors.education_level}>
          <select
            id="application-track"
            value={level}
            onChange={(event) => changeLevel(event.target.value as EducationLevel)}
            className={selectClassName}
          >
            {tracks.map((track) => (
              <option key={track} value={track}>
                {EDUCATION_LEVEL_LABELS[track]}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="text-sm text-white/75">
          Track: {EDUCATION_LEVEL_LABELS[level]}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
        <Field id="application-title" label="Title" error={errors.title}>
          <select
            id="application-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={selectClassName}
            required
          >
            <option value="" disabled>
              Select
            </option>
            {APPLICANT_TITLES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field id="application-name" label="Name" error={errors.name}>
          <input
            id="application-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            className={inputClassName}
            required
          />
        </Field>
      </div>

      <Field id="application-email" label="Email" error={errors.email}>
        <input
          id="application-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className={inputClassName}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="application-password" label="Password" error={errors.password}>
          <input
            id="application-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={inputClassName}
            required
          />
        </Field>
        <Field id="application-confirm" label="Confirm password">
          <input
            id="application-confirm"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={inputClassName}
            required
          />
        </Field>
      </div>

      <Field id="application-country" label="Country" error={errors["institution.country"]}>
        <select
          id="application-country"
          value={country}
          onChange={(event) => changeCountry(event.target.value)}
          className={selectClassName}
          required
        >
          <option value="" disabled>
            Select a country
          </option>
          {COUNTRIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </Field>

      {isMalaysia ? (
        <Field id="application-institution-type" label="Institution type">
          <select
            id="application-institution-type"
            value={institutionType}
            onChange={(event) => {
              setInstitutionType(event.target.value as MalaysiaInstitutionType | "");
              setInstitutionName("");
            }}
            className={selectClassName}
            required
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
        id="application-organisation"
        label="Organisation / university"
        error={errors["institution.name"]}
      >
        {isMalaysia ? (
          <select
            id="application-organisation"
            value={institutionName}
            onChange={(event) => setInstitutionName(event.target.value)}
            className={selectClassName}
            required
            disabled={!institutionType}
          >
            <option value="" disabled>
              {institutionType ? "Select a university" : "Select an institution type first"}
            </option>
            {institutionType
              ? MALAYSIA_UNIVERSITIES[institutionType].map((university) => (
                  <option key={university} value={university}>
                    {university}
                  </option>
                ))
              : null}
          </select>
        ) : (
          <input
            id="application-organisation"
            value={institutionName}
            onChange={(event) => setInstitutionName(event.target.value)}
            autoComplete="organization"
            className={inputClassName}
            required
          />
        )}
      </Field>
      <p className="-mt-2 text-sm text-white/60">
        Malaysian applicants choose their university so they are not assigned
        projects from their own institution.
      </p>

      <Field id="application-address" label="Address" error={errors.address}>
        <input
          id="application-address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          autoComplete="street-address"
          className={inputClassName}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="application-postcode" label="Postcode" error={errors.postcode}>
          <input
            id="application-postcode"
            value={postcode}
            onChange={(event) => setPostcode(event.target.value)}
            autoComplete="postal-code"
            className={inputClassName}
            required
          />
        </Field>
        <Field id="application-phone" label="Mobile number" error={errors.phone}>
          <input
            id="application-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            className={inputClassName}
            required
          />
        </Field>
      </div>

      <Field id="application-national-id" label="National ID" error={errors.national_id}>
        <input
          id="application-national-id"
          value={nationalId}
          onChange={(event) => setNationalId(event.target.value)}
          autoComplete="off"
          className={inputClassName}
          required
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Categories you can evaluate</legend>
        {visibleCategories.length === 0 ? (
          <p className="text-sm text-white/70">No categories are open for this track yet.</p>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-white/15 p-3">
            {visibleCategories.map((category) => {
              const inputId = `application-category-${category.id}`;
              return (
                <div key={category.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    id={inputId}
                    checked={categoryIds.includes(category.id)}
                    onCheckedChange={(checked) => {
                      setCategoryIds((current) =>
                        checked === true
                          ? [...current, category.id]
                          : current.filter((id) => id !== category.id)
                      );
                    }}
                    className="mt-0.5 border-white/40"
                  />
                  <label htmlFor={inputId}>{category.name}</label>
                </div>
              );
            })}
          </div>
        )}
        {errors.category_ids ? (
          <p className="text-sm text-red-300">{errors.category_ids}</p>
        ) : null}
      </fieldset>

      <Field
        id="application-expertise"
        label="Field of expertise"
        error={errors.field_of_expertise}
      >
        <input
          id="application-expertise"
          value={expertise}
          onChange={(event) => setExpertise(event.target.value)}
          className={inputClassName}
          required
        />
      </Field>

      {kind === "JUDGE" ? (
        <Field
          id="application-experience"
          label="Experience as a judge"
          error={errors.jury_experience}
        >
          <textarea
            id="application-experience"
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
            className={textareaClassName}
            required
          />
        </Field>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium" id="application-cv-label">
          CV
        </p>
        <FilePicker
          id="application-cv"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          uploading={cv.uploading}
          fileName={cv.fileName}
          variant="marketing"
          onFile={handleCv}
          onRemove={() => setCv({ fileName: "", fileUrl: "", uploading: false })}
        />
        {errors.cv_file_name ? (
          <p className="text-sm text-red-300">{errors.cv_file_name}</p>
        ) : null}
      </div>

      <div className="flex items-start gap-2 text-sm leading-relaxed text-white/85">
        <Checkbox
          id="application-declaration"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked === true)}
          className="mt-1 border-white/40"
        />
        <label htmlFor="application-declaration">{declaration}</label>
      </div>
      {errors.declaration_accepted ? (
        <p className="text-sm text-red-300">{errors.declaration_accepted}</p>
      ) : null}

      {formError ? <p className="text-sm text-red-300">{formError}</p> : null}

      <button
        type="submit"
        disabled={pending || cv.uploading}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-[#d6a11e] px-7 text-sm font-bold tracking-wide text-[#1a1408] transition-colors hover:bg-[#e2b43a] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
