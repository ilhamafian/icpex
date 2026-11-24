import { IconArrowRight, IconBulb, IconSchool } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DatesList, SectionHeading } from "@/components/marketing/blocks";
import { WHY_JOIN } from "@/components/marketing/content";
import { Rise } from "@/components/marketing/Rise";
import { WelcomeHighlight } from "@/components/marketing/WelcomeHighlight";
import { LiquidGlass } from "@/components/ui/liquid-glass";

export default function HomePage() {
  return (
    <>
      <section className="mx-auto flex min-h-[calc(100vh-4.25rem)] w-full max-w-6xl flex-col justify-center px-6 py-16">
        <div>
          <Rise when="load">
            <p className="text-sm font-semibold tracking-[0.18em] text-[#e8b84a] uppercase sm:text-base">
              International Competition for
            </p>
          </Rise>
          <Rise when="load" delay={0.1}>
            <h1 className="mt-4 text-[clamp(1.45rem,4.2vw,3.75rem)] leading-[1.05] font-bold tracking-tight uppercase">
              <span className="block whitespace-nowrap">Research, Innovation &</span>
              <span className="block">Value Excellence</span>
            </h1>
          </Rise>
          <Rise when="load" delay={0.2} className="max-w-xl">
            <p className="mt-8 text-3xl font-bold sm:text-4xl">
              <span className="text-[#e8b84a]">I-CRIVE</span> 2027
            </p>
            <p className="mt-2 text-lg text-white/90">
              Innovating for a Smarter, Sustainable Future
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#d6a11e] px-7 text-sm font-bold tracking-wide text-[#1a1408] transition-colors hover:bg-[#e2b43a]"
              >
                Register Now
                <IconArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="#categories" className="inline-flex rounded-full">
                <LiquidGlass
                  tint={0}
                  className="text-white shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100"
                  style={{ backgroundColor: "rgb(53 86 127 / 0.72)" }}
                  contentClassName="flex h-12 items-center justify-center px-7 text-sm font-bold tracking-wide"
                >
                  Explore Tracks
                </LiquidGlass>
              </Link>
            </div>
          </Rise>
        </div>
      </section>

      <section className="mx-auto flex min-h-[90vh] w-full max-w-6xl flex-col items-center justify-center px-6 py-28 text-center">
        <Rise>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Welcome to I-CRIVE 2027
          </h2>
        </Rise>
        <Rise delay={0.08}>
          <div className="mt-6 h-px w-16 bg-[#e8b84a]" aria-hidden />
        </Rise>
        <Rise delay={0.14} className="mt-8">
          <WelcomeHighlight className="max-w-3xl text-lg leading-relaxed font-normal text-pretty sm:text-xl" />
        </Rise>
        <Rise delay={0.22} className="mt-14">
          <Link href="/about" className="inline-flex rounded-full">
            <LiquidGlass
              tint={0}
              className="shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100"
              style={{ backgroundColor: "rgb(53 86 127 / 0.72)" }}
              contentClassName="flex h-12 items-center justify-center gap-2 px-7 text-sm font-bold tracking-wide text-[#e8b84a]"
            >
              Learn More
              <IconArrowRight className="size-4" aria-hidden />
            </LiquidGlass>
          </Link>
        </Rise>
      </section>

      <section id="categories" className="scroll-mt-24 mx-auto w-full max-w-5xl px-6 py-32">
        <Rise>
          <SectionHeading
            title="Competition Categories"
            description="Choose your category and showcase your excellence in innovation and research."
          />
        </Rise>
        <div className="grid gap-6 md:grid-cols-2">
          <Rise delay={0.06} className="h-full">
            <CategoryCard
              href="/categories/undergraduate"
              icon={<IconBulb className="size-8 text-[#e8b84a]" aria-hidden />}
              title="Undergraduate"
              subtitle="Innovation Project Competition"
              tracks="6 Tracks"
            />
          </Rise>
          <Rise delay={0.14} className="h-full">
            <CategoryCard
              href="/categories/postgraduate"
              icon={<IconSchool className="size-8 text-[#e8b84a]" aria-hidden />}
              title="Postgraduate"
              subtitle="Five-Minute Thesis (5MT) Competition"
              tracks="3 Tracks"
            />
          </Rise>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <Rise>
          <SectionHeading
            title="Why Join I-CRIVE 2027?"
            description="Discover opportunities to showcase your talent, advance your research and gain international recognition."
          />
        </Rise>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_JOIN.map((item, index) => (
            <li key={item.title} className="h-full">
              <Rise className="h-full" delay={index * 0.06}>
                <WhyJoinCard title={item.title} body={item.body} />
              </Rise>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <Rise>
          <SectionHeading title="Important Dates" />
        </Rise>
        <Rise delay={0.08}>
          <DatesList />
        </Rise>
      </section>
    </>
  );
}

function WhyJoinCard({ title, body }: { title: string; body: string }) {
  return (
    <LiquidGlass
      tint={0}
      radius={28}
      className="h-full shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]"
      style={{ backgroundColor: "rgb(53 86 127 / 0.72)" }}
      contentClassName="flex h-full flex-col px-6 py-8 text-center sm:px-8"
    >
      <h3 className="text-lg font-bold text-[#e8b84a]">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/80">{body}</p>
    </LiquidGlass>
  );
}

function CategoryCard({
  href,
  icon,
  title,
  subtitle,
  tracks,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  tracks: string;
}) {
  return (
    <LiquidGlass
      tint={0}
      radius={28}
      className="shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]"
      style={{ backgroundColor: "rgb(53 86 127 / 0.72)" }}
      contentClassName="flex flex-col items-center px-6 py-12 text-center sm:px-8"
    >
      {icon}
      <h3 className="mt-3 text-2xl font-bold">{title}</h3>
      <p className="mt-1 text-white/80">{subtitle}</p>
      <p className="mt-3 font-bold text-[#e8b84a]">{tracks}</p>
      <Link
        href={href}
        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-[#102033] transition-colors hover:bg-white/90"
      >
        Explore →
      </Link>
    </LiquidGlass>
  );
}
