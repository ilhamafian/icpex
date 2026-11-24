import type { Metadata } from "next";

import { OBJECTIVES } from "@/components/marketing/content";
import { LiquidGlass } from "@/components/ui/liquid-glass";

export const metadata: Metadata = {
  title: "About",
  description:
    "I-CRIVE 2027 is organised by the Research & Innovation Section, UniKL MIIT.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-16">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">About I-CRIVE</h1>
      <div className="mt-5 h-px w-full bg-[#e8b84a]" />
      <div className="mt-8 max-w-4xl space-y-5 text-base leading-relaxed text-white/85 sm:text-lg">
        <p>
          The <strong className="font-semibold text-white">International Competition for Research, Innovation & Value Excellence (I-CRIVE 2027)</strong> is
          organised by the <strong className="font-semibold text-white">Research & Innovation Section, Universiti Kuala Lumpur Malaysian Institute of Information Technology (UniKL MIIT)</strong>, a
          specialised institute of Universiti Kuala Lumpur (UniKL), one of Malaysia&apos;s leading
          technical universities.
        </p>
        <p>
          Building on the legacy of <strong className="font-semibold text-white">KLIIC (2020)</strong> and <strong className="font-semibold text-white">i-CPEX (2021–2023)</strong>, I-CRIVE 2027
          provides an international platform for undergraduate and postgraduate students to
          showcase innovative projects, communicate research findings and develop solutions to
          real-world challenges.
        </p>
        <p>
          Featuring the <strong className="font-semibold text-white">Undergraduate Innovation Project Competition</strong> and <strong className="font-semibold text-white">Postgraduate Five-Minute Thesis (5MT) Competition</strong>, the
          event promotes creativity, research excellence, collaboration and meaningful impact.
        </p>
      </div>
      <p className="mt-10 text-center text-lg italic text-white/90">
        Innovating for a Smarter, Sustainable Future.
      </p>

      <section className="mt-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Our Objectives</h2>
        <div className="mx-auto mt-4 h-px max-w-5xl bg-[#e8b84a]" />
        <p className="mx-auto mt-6 max-w-3xl text-center text-white/80">
          Empowering innovation, advancing research and creating meaningful impact.
        </p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {OBJECTIVES.map((item) => (
            <li key={item.title} className="h-full">
              <LiquidGlass
                tint={0}
                radius={28}
                className="h-full shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]"
                style={{ backgroundColor: "rgb(53 86 127 / 0.72)" }}
                contentClassName="flex h-full flex-col px-6 py-8 text-center sm:px-8"
              >
                <h3 className="text-lg font-bold text-[#e8b84a]">{item.title}</h3>
                <p className="mt-3 text-white/80">{item.body}</p>
              </LiquidGlass>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
