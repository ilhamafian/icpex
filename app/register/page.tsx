import Link from "next/link";
import { RegistrationForm } from "@/components/RegistrationForm";
import { allowedEducationLevels } from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import { CategoryModel } from "@/models/Category";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { parseLevelParam } from "@/utils/registrationLinks";

async function loadOptions() {
  try {
    const [competition, categories] = await Promise.all([
      getCurrentCompetition(),
      new CategoryModel().getCategories(),
    ]);

    return {
      competitionId: competition ? toIdString(competition._id) : "",
      competitionName: competition?.name ?? "",
      educationLevels: allowedEducationLevels(competition?.eligibility),
      categories: (categories ?? []).map((c) => ({
        id: toIdString(c._id),
        name: c.name,
      })),
    };
  } catch {
    return {
      competitionId: "",
      competitionName: "",
      educationLevels: allowedEducationLevels(undefined),
      categories: [],
    };
  }
}

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const [{ competitionId, competitionName, educationLevels, categories }, { level }] =
    await Promise.all([loadOptions(), searchParams]);
  const requestedLevel = parseLevelParam(level);
  const initialEducationLevel =
    requestedLevel && educationLevels.includes(requestedLevel)
      ? requestedLevel
      : undefined;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex w-full items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
        >
          ← Home
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Competition registration
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Complete your participant, project, team, supervisor, and document
            details, then continue to payment. Manual bank transfer only — no
            account or password is required.
          </p>
          {competitionName ? (
            <p className="mt-3 text-sm font-medium text-foreground">
              {competitionName}
            </p>
          ) : null}
        </div>
        {competitionId ? (
          <RegistrationForm
            competitionId={competitionId}
            educationLevels={educationLevels}
            initialEducationLevel={initialEducationLevel}
            categories={categories}
          />
        ) : (
          <p className="rounded-lg border border-black/10 px-4 py-6 text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-400">
            Registration is closed — there is no published competition right
            now. Please check back later.
          </p>
        )}
      </main>
    </div>
  );
}
