import type { Metadata } from "next";

import { ContentPage, InfoCard } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact the I-CRIVE 2027 undergraduate and postgraduate competition secretariats.",
};

const CONTACTS = [
  {
    level: "Undergraduate (UG)",
    competition: "Innovation Project Competition",
    email: "icriveug@unikl.edu.my",
  },
  {
    level: "Postgraduate (PG)",
    competition: "Five-Minute Thesis (5MT) Competition",
    email: "icrivepg@unikl.edu.my",
  },
] as const;

export default function ContactPage() {
  return (
    <ContentPage eyebrow="About" title="Contact Us">
      <div className="grid gap-6 md:grid-cols-2">
        {CONTACTS.map((contact) => (
          <InfoCard key={contact.email} title={contact.level} className="h-full">
            <p className="text-center leading-relaxed text-white/80">{contact.competition}</p>
            <p className="mt-5 text-center text-sm tracking-wide text-white/60">Email</p>
            <a
              href={`mailto:${contact.email}`}
              className="mt-1 block text-center font-semibold text-white underline-offset-2 hover:underline"
            >
              {contact.email}
            </a>
          </InfoCard>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-3xl text-center leading-relaxed text-white/80">
        I-CRIVE 2027 is organised by the Research & Innovation Section, Universiti Kuala Lumpur
        Malaysian Institute of Information Technology (UniKL MIIT).
      </p>
    </ContentPage>
  );
}
