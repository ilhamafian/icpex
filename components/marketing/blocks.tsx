import Link from "next/link";
import type { ReactNode } from "react";

import { DATES } from "@/components/marketing/content";
import { LiquidGlass } from "@/components/ui/liquid-glass";

export const cardGlassClass =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";
export const cardGlassStyle = { backgroundColor: "rgb(14 32 56 / 0.82)" };

export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-pretty text-base text-white/80 sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function ContentPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-16">
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-[0.2em] text-[#e8b84a] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      <div className="mt-5 h-px w-full bg-[#e8b84a]" />
      <div className="mt-10">{children}</div>
    </div>
  );
}

export function InfoCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <LiquidGlass
      tint={0}
      radius={28}
      className={`${cardGlassClass} ${className}`}
      style={cardGlassStyle}
      contentClassName="px-6 py-8 sm:px-8"
    >
      {title ? (
        <h3 className="text-center text-lg font-bold text-[#e8b84a]">{title}</h3>
      ) : null}
      <div className={title ? "mt-3" : undefined}>{children}</div>
    </LiquidGlass>
  );
}

export function BulletPanel({
  title,
  items,
  children,
}: {
  title: string;
  items: string[];
  children?: ReactNode;
}) {
  return (
    <LiquidGlass
      tint={0}
      radius={28}
      className={`h-full ${cardGlassClass}`}
      style={cardGlassStyle}
      contentClassName="px-6 py-8 sm:px-8 sm:py-10"
    >
      <h3 className="text-center text-sm font-bold tracking-[0.14em] text-[#e8b84a] uppercase">
        {title}
      </h3>
      <ul className="mx-auto mt-6 max-w-md list-disc space-y-2.5 pl-5 text-left text-sm leading-relaxed text-white/90 sm:text-base">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {children}
    </LiquidGlass>
  );
}

export function GuidelineSection({
  title,
  intro,
  panels,
}: {
  title: string;
  intro?: string;
  panels: { title: string; items: string[]; extra?: ReactNode }[];
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px max-w-5xl bg-[#e8b84a]" />
      {intro ? (
        <p className="mx-auto mt-8 max-w-3xl text-center text-pretty text-base text-white/80 sm:text-lg">
          {intro}
        </p>
      ) : null}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {panels.map((panel) => (
          <BulletPanel key={panel.title} title={panel.title} items={panel.items}>
            {panel.extra}
          </BulletPanel>
        ))}
      </div>
    </section>
  );
}

export function TrackList({
  tracks,
}: {
  tracks: readonly { title: string; body?: string; label?: string }[];
}) {
  return (
    <ul className="flex h-full flex-col justify-center gap-4">
      {tracks.map((track) => (
        <LiquidGlass
          key={track.title}
          as="li"
          tint={0}
          radius={20}
          className={cardGlassClass}
          style={cardGlassStyle}
          contentClassName="px-5 py-4 text-center"
        >
          {track.label ? (
            <p className="text-xs font-semibold tracking-[0.16em] text-white/55 uppercase">
              {track.label}
            </p>
          ) : null}
          <p className={`font-bold text-[#e8b84a] ${track.label ? "mt-1" : ""}`}>{track.title}</p>
          {track.body ? (
            <p className="mt-1 text-sm leading-relaxed text-white/80">{track.body}</p>
          ) : null}
        </LiquidGlass>
      ))}
    </ul>
  );
}

export function RulesSection({
  id,
  title,
  rules,
}: {
  id?: string;
  title: string;
  rules: readonly { text: string; points?: readonly string[] }[];
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-16">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <div className="mx-auto mt-4 h-px max-w-5xl bg-[#e8b84a]" />
      <LiquidGlass
        tint={0}
        radius={28}
        className={`mt-10 ${cardGlassClass}`}
        style={cardGlassStyle}
        contentClassName="px-6 py-8 sm:px-10 sm:py-10"
      >
        <ol className="list-decimal space-y-4 pl-5 text-sm leading-relaxed text-white/90 marker:font-semibold marker:text-[#e8b84a] sm:text-base">
          {rules.map((rule) => (
            <li key={rule.text} className="pl-1">
              {rule.text}
              {rule.points ? (
                <ul className="mt-2 list-disc space-y-2 pl-5 text-white/80">
                  {rule.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </LiquidGlass>
    </section>
  );
}

export function DatesList() {
  return (
    <LiquidGlass
      tint={0}
      radius={32}
      className={cardGlassClass}
      style={cardGlassStyle}
      contentClassName="px-5 py-6 sm:px-8 sm:py-8"
    >
      <ul className="flex flex-col gap-5">
        {DATES.map((item) => (
          <li
            key={item.title}
            className="grid items-start gap-1 lg:grid-cols-[11rem_minmax(0,1.1fr)_minmax(0,1.2fr)] lg:items-center lg:gap-6"
          >
            <p className="flex items-center gap-3 text-sm font-bold tracking-wide text-[#e8b84a] uppercase">
              <span className="size-2.5 shrink-0 bg-[#e8b84a]" aria-hidden />
              {item.date}
            </p>
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-white/75 sm:text-base">{item.detail}</p>
          </li>
        ))}
      </ul>
    </LiquidGlass>
  );
}

export function RegisterButton({
  href,
  children,
  tone = "gold",
}: {
  href: string;
  children: ReactNode;
  tone?: "gold" | "slate";
}) {
  const className =
    tone === "gold"
      ? "inline-flex h-12 items-center justify-center rounded-lg bg-[#d6a11e] px-7 text-sm font-bold tracking-wide text-[#1a1408] uppercase transition-colors hover:bg-[#e2b43a]"
      : "inline-flex h-12 items-center justify-center rounded-lg bg-[#35567f] px-7 text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-[#426691]";

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
