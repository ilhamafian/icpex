import { IconArrowLeft } from "@tabler/icons-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RegistrationForm } from "@/components/RegistrationForm";
import { cardGlassClass, cardGlassStyle } from "@/components/marketing/blocks";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { effectiveDocumentRequirements } from "@/schemas/documentRequirement";
import { allowedEducationLevels } from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import { CategoryModel } from "@/models/Category";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { parseLevelParam } from "@/utils/registrationLinks";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Register one project for I-CRIVE 2027. Payment is by bank transfer after the secretariat reviews your submission.",
};

async function loadOptions() {
  try {
    const [competition, categories] = await Promise.all([
      getCurrentCompetition(),
      new CategoryModel().getCategories(),
    ]);

    return {
      competitionId: competition ? toIdString(competition._id) : "",
      educationLevels: allowedEducationLevels(competition?.eligibility),
      documentRequirements: effectiveDocumentRequirements(competition),
      categories: (categories ?? []).map((c) => ({
        id: toIdString(c._id),
        name: c.name,
        educationLevel: c.education_level,
      })),
    };
  } catch {
    return {
      competitionId: "",
      educationLevels: allowedEducationLevels(undefined),
      documentRequirements: effectiveDocumentRequirements(null),
      categories: [],
    };
  }
}

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const [
    {
      competitionId,
      educationLevels,
      documentRequirements,
      categories,
    },
    { level },
  ] = await Promise.all([loadOptions(), searchParams]);
  const requestedLevel = parseLevelParam(level);
  const initialEducationLevel =
    requestedLevel && educationLevels.includes(requestedLevel)
      ? requestedLevel
      : undefined;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-8 pb-14 sm:pt-10 sm:pb-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 transition-colors hover:text-[#e8b84a]"
      >
        <IconArrowLeft className="size-4" aria-hidden />
        Home
      </Link>
      <p className="mt-8 text-xs font-semibold tracking-[0.2em] text-[#e8b84a] uppercase">
        I-CRIVE 2027
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        Register
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80">
        Register one project with its participant, team, supervisors and documents.
        Payment is by bank transfer after the secretariat reviews your submission.
        No account is required.
      </p>
      <div className="mt-6 h-px w-full bg-[#e8b84a]" />
      <div className="mt-10">
        {competitionId ? (
          <RegistrationForm
            competitionId={competitionId}
            educationLevels={educationLevels}
            documentRequirements={documentRequirements}
            initialEducationLevel={initialEducationLevel}
            educationLevelLocked={Boolean(initialEducationLevel)}
            categories={categories}
          />
        ) : (
          <LiquidGlass
            tint={0}
            radius={28}
            className={cardGlassClass}
            style={cardGlassStyle}
            contentClassName="px-6 py-8 sm:px-8"
          >
            <h2 className="text-lg font-bold text-[#e8b84a]">Registration is closed</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              There is no published competition right now. Please check back later.
            </p>
          </LiquidGlass>
        )}
      </div>
    </div>
  );
}
