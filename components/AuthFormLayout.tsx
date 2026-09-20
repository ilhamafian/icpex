import Link from "next/link";

type AuthFormLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthFormLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthFormLayoutProps) {
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
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {subtitle}
            </p>
          </div>
          {children}
          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {footer}
          </p>
        </div>
      </main>
    </div>
  );
}
