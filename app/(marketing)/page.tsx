import { IconArrowRight, IconBulb, IconSchool } from "@tabler/icons-react";
import Link from "next/link";

import { DatesList, InfoCard, SectionHeading } from "@/components/marketing/blocks";
import { WHY_JOIN } from "@/components/marketing/content";
import { WelcomeHighlight } from "@/components/marketing/WelcomeHighlight";
import { LiquidGlass } from "@/components/ui/liquid-glass";

export default function HomePage() {
  return (
    <>
      <section className="mx-auto flex min-h-[calc(100vh-4.25rem)] w-full max-w-6xl flex-col justify-center px-6 py-16">
        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-[#e8b84a] uppercase sm:text-base">
            International Competition for
          </p>
          <h1 className="mt-4 text-[clamp(1.45rem,4.2vw,3.75rem)] leading-[1.05] font-bold tracking-tight uppercase">
            <span className="block whitespace-nowrap">Research, Innovation &</span>
            <span className="block">Value Excellence</span>
          </h1>
          <div className="max-w-xl">
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
          </div>
        </div>
      </section>

      <section className="mx-auto flex min-h-[90vh] w-full max-w-6xl flex-col items-center justify-center px-6 py-28 text-center">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Welcome to I-CRIVE 2027
        </h2>
        <div className="mt-6 h-px w-16 bg-[#e8b84a]" aria-hidden />
        <WelcomeHighlight className="mt-8 max-w-3xl text-lg leading-relaxed font-normal text-pretty sm:text-xl" />
        <div className="mt-14">
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
        </div>
      </section>

      <section id="categories" className="scroll-mt-24 mx-auto w-full max-w-5xl px-6 py-20">
        <SectionHeading
          title="Competition Categories"
          description="Choose your category and showcase your excellence in innovation and research."
        />
        <div className="grid gap-6 md:grid-cols-2">
          <InfoCard>
            <div className="flex flex-col items-center text-center">
              <IconBulb className="size-8 text-[#e8b84a]" aria-hidden />
              <h3 className="mt-3 text-2xl font-bold">Undergraduate</h3>
              <p className="mt-1 text-white/80">Innovation Project Competition</p>
              <p className="mt-3 font-bold text-[#e8b84a]">6 Tracks</p>
              <Link
                href="/categories/undergraduate"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-[#102033] transition-colors hover:bg-white/90"
              >
                Explore →
              </Link>
            </div>
          </InfoCard>
          <InfoCard>
            <div className="flex flex-col items-center text-center">
              <IconSchool className="size-8 text-[#e8b84a]" aria-hidden />
              <h3 className="mt-3 text-2xl font-bold">Postgraduate</h3>
              <p className="mt-1 text-white/80">Five-Minute Thesis (5MT) Competition</p>
              <p className="mt-3 font-bold text-[#e8b84a]">3 Tracks</p>
              <Link
                href="/categories/postgraduate"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-[#102033] transition-colors hover:bg-white/90"
              >
                Explore →
              </Link>
            </div>
          </InfoCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <SectionHeading
          title="Why Join I-CRIVE 2027?"
          description="Discover opportunities to showcase your talent, advance your research and gain international recognition."
        />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_JOIN.map((item) => (
            <li key={item.title}>
              <InfoCard title={item.title}>
                <p className="text-center text-sm leading-relaxed text-white/80">{item.body}</p>
              </InfoCard>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <SectionHeading title="Important Dates" />
        <DatesList />
      </section>
    </>
  );
}
