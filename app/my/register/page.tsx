import { RegistrationForm } from "@/components/RegistrationForm";
import { paperCardClassName } from "@/components/marketing/registrationFormUi";
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
      <p className="text-xs font-semibold tracking-[0.2em] text-[#8a6410] uppercase">
        I-CRIVE 2027
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight">Register</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5c6e82]">
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
          <p className={`${paperCardClassName} px-6 py-8 text-sm text-[#5c6e82]`}>
            Registration is not open yet. Please check back once the competition is published.
          </p>
        )}
      </div>
    </div>
  );
}
