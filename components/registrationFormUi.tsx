export const inputClassName =
  "h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none transition-colors focus:border-foreground dark:border-white/15";

export const textareaClassName =
  "min-h-28 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2.5 text-sm outline-none transition-colors focus:border-foreground dark:border-white/15";

export const fileInputClassName =
  "block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-black/10 file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground dark:text-zinc-400 dark:file:border-white/15";

export const linkButtonClassName =
  "text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline";

export const mutedTextClassName = "text-sm text-zinc-600 dark:text-zinc-400";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-black/10 pt-8 first:border-t-0 first:pt-0 dark:border-white/10">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className={`mt-1 ${mutedTextClassName}`}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
