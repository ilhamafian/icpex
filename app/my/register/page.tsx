import { RegistrationForm } from "@/components/RegistrationForm";
import { cardGlassClass, cardGlassStyle } from "@/components/marketing/blocks";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { loadRegistrationFormOptions } from "@/utils/loadRegistrationFormOptions";
import { parseLevelParam } from "@/utils/registrationLinks";

export default async function NewRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const [options, params] = await Promise.all([
    loadRegistrationFormOptions(),
    searchParams,
  ]);
  const requestedLevel = parseLevelParam(params.level);
  const initialEducationLevel =
    requestedLevel && options.educationLevels.includes(requestedLevel)
      ? requestedLevel
      : undefined;

  return (
    <div className="px-4 lg:px-6">
      <p className="text-xs font-semibold tracking-[0.2em] text-[#e8b84a] uppercase">
        I-CRIVE 2027
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight">Register</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
        Register one project with its participant, team, supervisors and documents.
        Payment is by bank transfer after the secretariat reviews your submission.
      </p>
      <div className="mt-8">
        {options.competitionId ? (
          <RegistrationForm
            competitionId={options.competitionId}
            educationLevels={options.educationLevels}
            documentRequirements={options.documentRequirements}
            initialEducationLevel={initialEducationLevel}
            educationLevelLocked={Boolean(initialEducationLevel)}
            categories={options.categories}
          />
        ) : (
          <LiquidGlass
            tint={0}
            radius={28}
            className={cardGlassClass}
            style={cardGlassStyle}
            contentClassName="px-6 py-8 text-sm text-white/80"
          >
            Registration is not open yet. Please check back once the competition is published.
          </LiquidGlass>
        )}
      </div>
    </div>
  );
}
