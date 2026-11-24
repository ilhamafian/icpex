"use client";

/**
 * Native file inputs reset to "No file chosen" when their value is cleared
 * after an upload. This control keeps the chosen name in our own text.
 */
export function FilePicker({
  id,
  accept,
  disabled,
  uploading = false,
  fileName = "",
  showName = true,
  onFile,
  onRemove,
  variant = "plain",
}: {
  id: string;
  accept?: string;
  disabled?: boolean;
  uploading?: boolean;
  fileName?: string;
  /** When false, the name stays off the row (a parent already shows it). */
  showName?: boolean;
  onFile: (file: File | undefined) => void;
  onRemove?: () => void;
  variant?: "marketing" | "plain";
}) {
  const busy = Boolean(disabled || uploading);
  const chosen = fileName.trim().length > 0;
  const buttonClass =
    variant === "marketing"
      ? "inline-flex h-10 cursor-pointer items-center rounded-full bg-[#d6a11e] px-4 text-sm font-bold text-[#1a1408] transition-colors group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-[#e8b84a]/50 hover:bg-[#e2b43a]"
      : "inline-flex h-10 cursor-pointer items-center rounded-lg border border-black/10 px-3 text-sm font-medium text-foreground transition-colors group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-foreground/25 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";
  const nameClass =
    variant === "marketing"
      ? "min-w-0 truncate text-sm text-white/85"
      : "min-w-0 truncate text-sm text-zinc-600 dark:text-zinc-400";
  const removeClass =
    variant === "marketing"
      ? "shrink-0 text-sm text-white/65 underline-offset-4 hover:underline disabled:opacity-60"
      : "shrink-0 text-sm text-zinc-600 underline-offset-4 hover:underline disabled:opacity-60 dark:text-zinc-400";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <label className={busy ? "group pointer-events-none opacity-60" : "group"}>
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            onFile(file);
          }}
        />
        <span className={buttonClass}>
          {uploading ? "Uploading…" : chosen ? "Replace file" : "Choose file"}
        </span>
      </label>
      {showName && chosen ? (
        <span className={nameClass}>
          {uploading ? `Uploading ${fileName}…` : fileName}
        </span>
      ) : null}
      {onRemove && chosen && !uploading ? (
        <button type="button" onClick={onRemove} className={removeClass} disabled={busy}>
          Remove
        </button>
      ) : null}
    </div>
  );
}
