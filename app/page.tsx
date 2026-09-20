import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex w-full items-center justify-end gap-3 border-b border-black/10 px-6 py-4 dark:border-white/10">
        <Link
          href="/login"
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Competition registration
        </Link>
      </header>
      <main className="flex-1" />
    </div>
  );
}
