"use client";

import type { ReactNode } from "react";

/** Dark-glass fields for the auth pages. */
export const inputClassName =
  "h-11 w-full rounded-xl border border-white/15 bg-[#07111d]/55 px-3 text-sm text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] outline-none transition-colors placeholder:text-white/35 focus:border-[#e8b84a] focus:ring-2 focus:ring-[#e8b84a]/30 disabled:cursor-not-allowed disabled:opacity-50";

/** Pale fields for the participant workspace. */
export const paperInputClassName =
  "h-11 w-full rounded-xl border border-[#d5e1ec] bg-white px-3 text-sm text-[#10243c] outline-none transition-colors placeholder:text-[#8aa0b5] focus:border-[#c4922a] focus:ring-2 focus:ring-[#c4922a]/25 disabled:cursor-not-allowed disabled:bg-[#f3f6f9] disabled:text-[#6b7c90]";

export const textareaClassName =
  "min-h-32 w-full rounded-xl border border-[#d5e1ec] bg-white px-3 py-2.5 text-sm text-[#10243c] outline-none transition-colors placeholder:text-[#8aa0b5] focus:border-[#c4922a] focus:ring-2 focus:ring-[#c4922a]/25 disabled:cursor-not-allowed disabled:bg-[#f3f6f9] disabled:text-[#6b7c90]";

export const linkButtonClassName =
  "text-sm font-semibold text-[#8a6410] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-[#8aa0b5] disabled:no-underline";

export const mutedTextClassName = "text-sm leading-relaxed text-[#5c6e82]";

export const paperCardClassName =
  "rounded-3xl border border-[#d5e1ec] bg-white shadow-[0_1px_2px_rgb(16_36_60/0.04)]";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-700">{message}</p>;
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${paperCardClassName} flex flex-col gap-4 px-5 py-6 sm:px-7 sm:py-7`}>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[#8a6410]">{title}</h2>
        {description ? <p className={`mt-1 ${mutedTextClassName}`}>{description}</p> : null}
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
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#10243c]">
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
