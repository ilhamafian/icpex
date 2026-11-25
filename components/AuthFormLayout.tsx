import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";

import { cardGlassClass, cardGlassStyle } from "@/components/marketing/blocks";
import { RingField } from "@/components/ring-field";
import { LiquidGlass } from "@/components/ui/liquid-glass";

type AuthFormLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  wide?: boolean;
};

/** Tilted rings that keep turning, used behind the auth screens. */
const ORBIT = {
  centerX: 0.12,
  centerY: 0.02,
  scale: 1.28,
  tilt: 64,
  twist: 1.15,
  morph: 0.3,
  aspect: 1.28,
  outerRadius: 1.6,
  rotation: 0.07,
  flowSpeed: 0.04,
} as const;

export function AuthFormLayout({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: AuthFormLayoutProps) {
  return (
    <div className="dark relative flex min-h-full flex-1 flex-col text-white">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <RingField
          className="h-full min-h-full"
          backgroundColor="#07111d"
          colors={["#9ec8e0", "#f0d078"]}
          glow={1.05}
          intensity={1.45}
          particleSize={1.7}
          sparkle={0.16}
          interactive={false}
          {...ORBIT}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07111d] from-8% via-[#07111d]/72 via-36% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07111d]/20 via-transparent to-[#07111d]/70" />
      </div>
      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        <header className="px-6 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 transition-colors hover:text-[#e8b84a]"
          >
            <IconArrowLeft className="size-4" aria-hidden />
            Home
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          <LiquidGlass
            tint={0}
            radius={28}
            className={`${cardGlassClass} w-full ${wide ? "max-w-lg" : "max-w-md"}`}
            style={cardGlassStyle}
            contentClassName="px-6 py-8 sm:px-8"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-[#e8b84a] uppercase">
              I-CRIVE 2027
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <p className="mt-6 text-center text-sm text-white/60 [&_a]:font-semibold [&_a]:text-[#e8b84a] [&_a]:underline-offset-2 hover:[&_a]:underline">
              {footer}
            </p>
          </LiquidGlass>
        </main>
      </div>
    </div>
  );
}
