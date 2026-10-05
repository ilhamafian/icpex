import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type LandingHeroProps = {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageSrc?: string | null;
  meta?: string;
  className?: string;
};

export function LandingHero({
  eyebrow,
  headline,
  subheadline,
  ctaLabel,
  ctaHref = "/register",
  imageSrc,
  meta,
  className,
}: LandingHeroProps) {
  return (
    <section
      className={cn(
        "relative isolate flex min-h-[28rem] items-end overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 text-white",
        className
      )}
    >
      {imageSrc ? (
        <>
          <Image
            src={imageSrc}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="-z-20 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />
        </>
      ) : null}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-16 sm:py-20">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {headline}
        </h1>
        {subheadline ? (
          <p className="max-w-2xl text-base text-pretty text-white/80 sm:text-lg">
            {subheadline}
          </p>
        ) : null}
        {meta ? <p className="text-sm font-medium text-white/70">{meta}</p> : null}
        {ctaLabel ? (
          <div className="pt-2">
            <Link
              href={ctaHref}
              className="inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-white/85"
            >
              {ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
