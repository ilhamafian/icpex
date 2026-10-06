import Link from "next/link";
import { connection } from "next/server";
import {
  IconArrowRight,
  IconAward,
  IconCalendarEvent,
  IconCash,
  IconCategory,
  IconChevronDown,
  IconCircleCheck,
  IconFileText,
  IconReceipt,
  IconSchool,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";

import { LandingHero, type LandingHeroProps } from "@/components/LandingHero";
import { BannerModel } from "@/models/Banner";
import { CategoryModel } from "@/models/Category";
import {
  COMPETITION_ELIGIBILITY_LABELS,
  DEFAULT_COMPETITION_ELIGIBILITY,
} from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import { formatCompetitionDates } from "@/utils/competitionDates";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { REGISTRATION_FEE } from "@/utils/registrationFee";
import { registrationLinks } from "@/utils/registrationLinks";
import { bannerImageSrc } from "@/utils/serializeBanner";

type LandingData = {
  hero: LandingHeroProps;
  competition: {
    name: string;
    dates: string;
    eligibility: string;
  } | null;
  categories: { id: string; name: string }[];
};

const CLOSED_HERO: LandingHeroProps = {
  eyebrow: "International Competition",
  headline: "ICPEX",
  subheadline:
    "Registration is closed right now. Please check back for the next competition.",
};

async function loadLanding(): Promise<LandingData> {
  await connection();
  try {
    const [competition, categories] = await Promise.all([
      getCurrentCompetition(),
      new CategoryModel().find({}, { sort: { name: 1 } }),
    ]);
    const categoryOptions = categories.map((c) => ({
      id: toIdString(c._id),
      name: c.name,
    }));

    if (!competition) {
      return { hero: CLOSED_HERO, competition: null, categories: categoryOptions };
    }

    const banner = await new BannerModel().findByCompetition(
      toIdString(competition._id)
    );
    const dates = formatCompetitionDates(
      competition.start_date,
      competition.end_date
    );
    const actions = registrationLinks(competition.eligibility);
    const hero: LandingHeroProps = banner
      ? {
          eyebrow: banner.eyebrow,
          headline: banner.headline,
          subheadline: banner.subheadline,
          actions,
          imageSrc: bannerImageSrc(banner),
          meta: dates,
        }
      : {
          eyebrow: "Registration now open",
          headline: competition.name,
          meta: dates,
          actions,
        };

    return {
      hero,
      competition: {
        name: competition.name,
        dates,
        eligibility:
          COMPETITION_ELIGIBILITY_LABELS[
            competition.eligibility ?? DEFAULT_COMPETITION_ELIGIBILITY
          ],
      },
      categories: categoryOptions,
    };
  } catch {
    return { hero: CLOSED_HERO, competition: null, categories: [] };
  }
}

const NAV_LINKS = [
  { href: "#categories", label: "Categories" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#prepare", label: "What to prepare" },
  { href: "#faq", label: "FAQ" },
];

const STEPS: { icon: Icon; title: string; body: string }[] = [
  {
    icon: IconFileText,
    title: "Submit your project",
    body: "Fill in participant, team and supervisor details, then upload your project documents.",
  },
  {
    icon: IconReceipt,
    title: "Pay by bank transfer",
    body: `Transfer the MYR ${REGISTRATION_FEE} registration fee and upload your receipt — no account needed.`,
  },
  {
    icon: IconCircleCheck,
    title: "Get verified",
    body: "Our secretariat checks your payment and confirms your registration number.",
  },
  {
    icon: IconAward,
    title: "Be judged by experts",
    body: "Thesis and e-book judges score each submission against published criteria.",
  },
];

const PREPARE_ITEMS = [
  "Project title and a clear abstract",
  "Project report (PDF or Word)",
  "Presentation slides, demo, video or photos (optional)",
  "Team lead, team members and supervisor contact details",
  "A government ID number (national ID, passport or driving licence)",
  "Your bank transfer receipt",
];

const FAQS = [
  {
    q: "Do I need to create an account?",
    a: "No. Registration is a single form — your details are stored with the registration only. Keep your registration number for reference.",
  },
  {
    q: "How do I pay?",
    a: `Payment is by manual bank transfer of MYR ${REGISTRATION_FEE}. The bank details appear on the second step of the registration form, where you upload your receipt.`,
  },
  {
    q: "What file types can I upload?",
    a: "PDF, Word, PowerPoint, ZIP, images (JPG, PNG, WebP, GIF) and video (MP4, WebM, MOV), up to 100 MB per file.",
  },
  {
    q: "Can I register as a team?",
    a: "Yes. Name a team lead and add as many team members as you need, along with your academic supervisors.",
  },
  {
    q: "How is my project judged?",
    a: "Each submission is assigned to qualified judges who score it against the competition's judging criteria. Results are based on the panel's scores.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-pretty text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function Fact({
  icon: FactIcon,
  label,
  value,
}: {
  icon: Icon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FactIcon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-0.5 font-semibold text-pretty">{value}</p>
      </div>
    </div>
  );
}

export default async function Home() {
  const { hero, competition, categories } = await loadLanding();
  const open = competition !== null;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              IC
            </span>
            ICPEX
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/portal/login"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Staff login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <LandingHero {...hero} className="min-h-[32rem] pb-12" />

        {competition ? (
          <section aria-label="Competition at a glance" className="relative z-10 mx-auto -mt-12 w-full max-w-6xl px-6">
            <div className="grid divide-y overflow-hidden rounded-2xl border bg-card shadow-lg sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
              <Fact icon={IconCalendarEvent} label="Competition dates" value={competition.dates} />
              <Fact icon={IconSchool} label="Open to" value={competition.eligibility} />
              <Fact icon={IconCash} label="Registration fee" value={`MYR ${REGISTRATION_FEE.toFixed(2)}`} />
              <Fact
                icon={IconCategory}
                label="Categories"
                value={
                  categories.length
                    ? `${categories.length} categor${categories.length === 1 ? "y" : "ies"}`
                    : "To be announced"
                }
              />
            </div>
          </section>
        ) : null}

        <section id="categories" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20 sm:py-24">
          <SectionHeading
            eyebrow="Categories"
            title="Find the right category for your work"
            description={
              competition
                ? `Choose one category when you register for ${competition.name}.`
                : "Categories for the next competition will be listed here."
            }
          />
          {categories.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category, index) => (
                <li
                  key={category.id}
                  className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-sm font-semibold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium">{category.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Categories will be announced soon.
            </p>
          )}
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-y bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
            <SectionHeading
              eyebrow="How it works"
              title="From registration to results in four steps"
            />
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative flex flex-col gap-3 rounded-2xl border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <step.icon className="size-5" />
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-pretty text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="prepare" className="mx-auto grid w-full max-w-6xl scroll-mt-20 items-center gap-12 px-6 py-20 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Before you start
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Have these ready and registration takes about 15 minutes
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Everything is submitted in one sitting. Files upload as you go,
              so you can check each document before moving to payment.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <IconUsersGroup className="size-5 text-primary" />
              Individual and team entries welcome.
            </div>
          </div>
          <ul className="flex flex-col gap-3">
            {PREPARE_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
                <IconCircleCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="faq" className="scroll-mt-20 border-t bg-muted/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-24">
            <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
            <div className="flex flex-col gap-3">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-2xl border bg-card px-5 py-4 open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <IconChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm text-pretty text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[oklch(0.32_0.07_225)] to-zinc-950 px-8 py-14 text-center text-white sm:px-16">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_15%,oklch(0.72_0.14_215/0.35),transparent_45%)]"
            />
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {open ? `Ready to enter ${competition.name}?` : "Registration opens soon"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-white/80">
              {open
                ? `The competition runs ${competition.dates}. Registration takes about 15 minutes.`
                : "Check back here when the next competition is announced."}
            </p>
            {open ? (
              <Link
                href="/register"
                className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-white/85"
              >
                Start registration
                <IconArrowRight className="size-4" />
              </Link>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} ICPEX Competition Secretariat</p>
          <div className="flex items-center gap-6">
            <Link href="/register" className="transition-colors hover:text-foreground">
              Register
            </Link>
            <Link href="/portal/login" className="transition-colors hover:text-foreground">
              Staff login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
