import { IconBulb, IconSchool } from "@tabler/icons-react";
import Link from "next/link";

import { DatesList, InfoCard, RegisterButton, SectionHeading } from "@/components/marketing/blocks";
import { WHY_JOIN } from "@/components/marketing/content";

export default function HomePage() {
  return (
    <>
      <section className="mx-auto flex min-h-[calc(100vh-4.25rem)] w-full max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-[#e8b84a] uppercase sm:text-base">
            International Competition for
          </p>
          <h1 className="mt-4 text-4xl leading-[1.05] font-bold tracking-tight uppercase sm:text-5xl lg:text-6xl">
            Research, Innovation & Value Excellence
          </h1>
          <p className="mt-8 text-3xl font-bold sm:text-4xl">
            <span className="text-[#e8b84a]">I-CRIVE</span> 2027
          </p>
          <p className="mt-2 text-lg text-white/90">
            Innovating for a Smarter, Sustainable Future
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <RegisterButton href="/register">Register now</RegisterButton>
            <RegisterButton href="#categories" tone="slate">
              Explore tracks
            </RegisterButton>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome to I-CRIVE 2027</h2>
        <p className="mt-6 text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
          The International Competition for Research, Innovation & Value Excellence (I-CRIVE
          2027), organised by the Research & Innovation Section, UniKL MIIT, brings together
          undergraduate innovators and postgraduate researchers from around the world to showcase
          creative ideas, share research discoveries and develop impactful solutions to real-world
          challenges.
        </p>
        <div className="mt-8">
          <RegisterButton href="/about" tone="slate">
            <span className="text-[#e8b84a]">Learn more</span>
          </RegisterButton>
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
