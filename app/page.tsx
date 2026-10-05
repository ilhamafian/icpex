import Link from "next/link";
import { connection } from "next/server";

import { LandingHero, type LandingHeroProps } from "@/components/LandingHero";
import { BannerModel } from "@/models/Banner";
import { toIdString } from "@/schemas/objectId";
import { formatCompetitionDates } from "@/utils/competitionDates";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { bannerImageSrc } from "@/utils/serializeBanner";

async function loadHero(): Promise<LandingHeroProps> {
  await connection();
  try {
    const competition = await getCurrentCompetition();
    if (!competition) {
      return {
        headline: "ICPEX",
        subheadline:
          "Registration is closed right now. Please check back for the next competition.",
      };
    }

    const banner = await new BannerModel().findByCompetition(
      toIdString(competition._id)
    );
    const meta = formatCompetitionDates(
      competition.start_date,
      competition.end_date
    );
    if (!banner) {
      return { headline: competition.name, meta, ctaLabel: "Register now" };
    }

    return {
      eyebrow: banner.eyebrow,
      headline: banner.headline,
      subheadline: banner.subheadline,
      ctaLabel: banner.cta_label,
      imageSrc: bannerImageSrc(banner),
      meta,
    };
  } catch {
    return { headline: "ICPEX" };
  }
}

export default async function Home() {
  const hero = await loadHero();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex w-full items-center justify-end gap-3 border-b border-black/10 px-6 py-4 dark:border-white/10">
        <Link
          href="/portal/login"
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]"
        >
          Internal Login
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Competition registration
        </Link>
      </header>
      <main className="flex-1">
        <LandingHero {...hero} />
      </main>
    </div>
  );
}
