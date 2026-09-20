import Link from "next/link";
import { RegistrationForm } from "@/components/RegistrationForm";
import { toIdString } from "@/schemas/objectId";
import { CategoryModel } from "@/models/Category";
import { CompetitionModel } from "@/models/Competition";

async function loadOptions() {
  try {
    const [competitions, categories] = await Promise.all([
      new CompetitionModel().getValidCompetitions(),
      new CategoryModel().getCategories(),
    ]);

    return {
      competitions: (competitions ?? []).map((c) => ({
        id: toIdString(c._id),
        name: c.name,
      })),
      categories: (categories ?? []).map((c) => ({
        id: toIdString(c._id),
        name: c.name,
      })),
    };
  } catch {
    return { competitions: [], categories: [] };
  }
}

export default async function RegisterPage() {
  const { competitions, categories } = await loadOptions();

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
            Submit your participant, project, team, supervisor, and document
            details. No account or password is required — this form creates a
            competition registration only.
          </p>
        </div>
        <RegistrationForm
          competitions={competitions}
          categories={categories}
        />
      </main>
    </div>
  );
}
