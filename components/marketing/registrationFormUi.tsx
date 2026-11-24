"use client";

import type { ReactNode } from "react";

import { cardGlassClass, cardGlassStyle } from "@/components/marketing/blocks";
import { LiquidGlass } from "@/components/ui/liquid-glass";

export const inputClassName =
  "h-11 w-full rounded-xl border border-white/15 bg-[#07111d]/55 px-3 text-sm text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] outline-none transition-colors placeholder:text-white/35 focus:border-[#e8b84a] focus:ring-2 focus:ring-[#e8b84a]/30 disabled:cursor-not-allowed disabled:opacity-50";

export const textareaClassName =
  "min-h-32 w-full rounded-xl border border-white/15 bg-[#07111d]/55 px-3 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] outline-none transition-colors placeholder:text-white/35 focus:border-[#e8b84a] focus:ring-2 focus:ring-[#e8b84a]/30 disabled:cursor-not-allowed disabled:opacity-50";

export const linkButtonClassName =
  "text-sm font-semibold text-[#e8b84a] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-white/35 disabled:no-underline";

export const mutedTextClassName = "text-sm leading-relaxed text-white/65";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-300">{message}</p>;
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
    <LiquidGlass
      as="section"
      tint={0}
      radius={28}
      className={cardGlassClass}
      style={cardGlassStyle}
      contentClassName="flex flex-col gap-4 px-5 py-6 sm:px-7 sm:py-7"
    >
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[#e8b84a]">{title}</h2>
        {description ? <p className={`mt-1 ${mutedTextClassName}`}>{description}</p> : null}
      </div>
      {children}
    </LiquidGlass>
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
      <label htmlFor={id} className="text-sm font-medium text-white/90">
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
