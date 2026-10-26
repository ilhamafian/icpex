"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthFormLayout } from "@/components/AuthFormLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompetitionEligibility } from "@/schemas/educationLevel";
import type { UserRole } from "@/schemas/userRole";
import {
  COUNTRIES,
  MALAYSIA,
  MALAYSIA_INSTITUTION_TYPES,
  MALAYSIA_UNIVERSITIES,
  type MalaysiaInstitutionType,
} from "@/utils/institutions";
import { isScoringJudgeRole } from "@/utils/judgeTypes";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  SECRETARY: "Secretary",
  JUDGE_LEADER: "Judge Leader",
  THESIS_JUDGE: "Thesis Judge",
  JTEC_JUDGE: "JTEC Judge",
};

const LEVEL_OPTIONS: { value: CompetitionEligibility; label: string }[] = [
  { value: "UNDERGRADUATE", label: "Undergraduate" },
  { value: "POSTGRADUATE", label: "Postgraduate" },
  { value: "BOTH", label: "Both" },
];

const selectClassName =
  "h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

export type InviteCategory = {
  id: string;
  name: string;
};

type InviteAcceptFormProps = {
  token: string;
  email: string;
  roles: UserRole[];
  categories: InviteCategory[];
};

type Step = "account" | "profile";

export function InviteAcceptForm({
  token,
  email,
  roles,
  categories,
}: InviteAcceptFormProps) {
  const router = useRouter();
  const needsProfile = roles.some((role) => isScoringJudgeRole(role));
  const [step, setStep] = useState<Step>("account");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("");
  const [institutionType, setInstitutionType] = useState<
    MalaysiaInstitutionType | ""
  >("");
  const [institutionName, setInstitutionName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [educationLevel, setEducationLevel] = useState<
    CompetitionEligibility | ""
  >("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isMalaysia = country === MALAYSIA;
  const roleLabel = roles.map((role) => ROLE_LABELS[role] ?? role).join(", ");

  function changeCountry(next: string) {
    setCountry(next);
    setInstitutionType("");
    setInstitutionName("");
  }

  function validateAccount() {
    if (!name.trim()) return "Name is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  }

  function validateProfile() {
    if (!(COUNTRIES as readonly string[]).includes(country)) {
      return "Select a country.";
    }
    if (isMalaysia && !institutionType) return "Select an institution type.";
    if (!institutionName.trim()) {
      return isMalaysia
        ? "Select your university."
        : "Enter your university.";
    }
    if (
      isMalaysia &&
      institutionType &&
      !MALAYSIA_UNIVERSITIES[institutionType].includes(institutionName)
    ) {
      return "Select your university from the list.";
    }
    const id = nationalId.trim();
    if (id.length < 4) return "Enter a national ID.";
    if (id.length > 32) return "National ID is too long.";
    if (categories.length === 0) {
      return "No categories are available yet. Ask an administrator to add categories before you accept this invitation.";
    }
    if (categoryIds.length === 0) return "Select at least one category.";
    if (!educationLevel) return "Select who you can evaluate.";
    return null;
  }

  async function activate() {
    setPending(true);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          name: name.trim(),
          ...(needsProfile && educationLevel
            ? {
                judge_profile: {
                  institution: {
                    name: institutionName.trim(),
                    country,
                  },
                  national_id: nationalId.trim(),
                  category_ids: categoryIds,
                  education_eligibility: educationLevel,
                },
              }
            : {}),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Could not activate your account."
        );
        return;
      }

      router.push("/portal/login");
    } catch {
      setError("Could not activate your account.");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (step === "account") {
      const accountError = validateAccount();
      if (accountError) {
        setError(accountError);
        return;
      }
      if (needsProfile) {
        setStep("profile");
        return;
      }
      await activate();
      return;
    }

    const profileError = validateProfile();
    if (profileError) {
      setError(profileError);
      return;
    }
    await activate();
  }

  return (
    <AuthFormLayout
      title={step === "account" ? "Accept invitation" : "Judging profile"}
      subtitle={
        step === "account"
          ? "Verify your email and create a password to activate your account."
          : "Tell us where you work and which projects you can evaluate."
      }
      footer="ICPEX"
      wide={step === "profile"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {step === "account" ? (
          <>
            <div className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15">
              <p>
                <span className="text-muted-foreground">Email</span>
                <br />
                <span className="font-medium">{email}</span>
              </p>
              <p className="mt-2">
                <span className="text-muted-foreground">Role</span>
                <br />
                <span className="font-medium">{roleLabel}</span>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-password">Password</Label>
              <Input
                id="invite-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-confirm">Confirm password</Label>
              <Input
                id="invite-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm">
              <span className="text-muted-foreground">Email</span>
              <br />
              <span className="font-medium">{email}</span>
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-country">Country</Label>
              <select
                id="invite-country"
                value={country}
                onChange={(e) => changeCountry(e.target.value)}
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
            </div>

            {isMalaysia ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-institution-type">Institution type</Label>
                <select
                  id="invite-institution-type"
                  value={institutionType}
                  onChange={(e) => {
                    setInstitutionType(
                      e.target.value as MalaysiaInstitutionType | ""
                    );
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
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-university">University</Label>
              {isMalaysia ? (
                <select
                  id="invite-university"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className={selectClassName}
                  required
                  disabled={!institutionType}
                >
                  <option value="" disabled>
                    {institutionType
                      ? "Select a university"
                      : "Select an institution type first"}
                  </option>
                  {institutionType
                    ? MALAYSIA_UNIVERSITIES[institutionType].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))
                    : null}
                </select>
              ) : (
                <Input
                  id="invite-university"
                  type="text"
                  autoComplete="organization"
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder={
                    country
                      ? "Full official university name"
                      : "Select a country first"
                  }
                  disabled={!country}
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-national-id">National ID</Label>
              <Input
                id="invite-national-id"
                type="text"
                autoComplete="off"
                required
                minLength={4}
                maxLength={32}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
              />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">
                Categories you can evaluate
              </legend>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No categories are available yet. Ask an administrator to add
                  categories before you accept this invitation.
                </p>
              ) : (
                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-lg border border-black/10 p-3 dark:border-white/15">
                  {categories.map((category) => {
                    const inputId = `invite-category-${category.id}`;
                    return (
                      <div key={category.id} className="flex items-start gap-2">
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
                        />
                        <Label htmlFor={inputId} className="font-normal">
                          {category.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-level">Who you can evaluate</Label>
              <select
                id="invite-level"
                value={educationLevel}
                onChange={(e) =>
                  setEducationLevel(
                    e.target.value as CompetitionEligibility | ""
                  )
                }
                className={selectClassName}
                required
              >
                <option value="" disabled>
                  Select a level
                </option>
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex flex-col gap-2">
          {step === "profile" ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={pending}
              onClick={() => {
                setError(null);
                setStep("account");
              }}
            >
              Back
            </Button>
          ) : null}
          <Button type="submit" disabled={pending} className="h-11 w-full">
            {pending
              ? "Creating account…"
              : step === "account" && needsProfile
                ? "Continue"
                : "Verify email & create password"}
          </Button>
        </div>
      </form>
    </AuthFormLayout>
  );
}
