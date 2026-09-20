import { redirect } from "next/navigation";
import { adminLogout } from "@/app/actions/adminAuth";
import { getSession } from "@/lib/session";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex w-full items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
        <p className="text-sm font-medium text-foreground">Admin dashboard</p>
        <form action={adminLogout}>
          <button
            type="submit"
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Welcome, {session.username}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You are signed in as an administrator.
        </p>
      </main>
    </div>
  );
}
