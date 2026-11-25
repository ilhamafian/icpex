import type { Metadata } from "next";

import { JudgeApplicationForm } from "@/components/JudgeApplicationForm";
import { ContentPage, InfoCard } from "@/components/marketing/blocks";
import {
  JURY_CALL_RULES,
  REVIEWER_CALL_RULES,
} from "@/components/marketing/content";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { CategoryModel } from "@/models/Category";
import {
  allowedEducationLevels,
  type EducationLevel,
} from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import { getCurrentCompetition } from "@/utils/currentCompetition";

export const metadata: Metadata = {
  title: "Call for Jury",
  description:
    "Apply to judge I-CRIVE 2027 or review papers for JTeC. Appointments are confirmed by email after approval.",
};

const GLASS_CLASS =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";
const GLASS_STYLE = { backgroundColor: "rgb(14 32 56 / 0.82)" };

function trackFromQuery(value: string | undefined): EducationLevel | null {
  if (value === "undergraduate") return "UNDERGRADUATE";
  if (value === "postgraduate") return "POSTGRADUATE";
  return null;
}

function RuleList({
  title,
  rules,
}: {
  title: string;
  rules: readonly { title: string; text: string }[];
}) {
  return (
    <InfoCard title={title}>
      <ul className="space-y-4 text-sm leading-relaxed text-white/85 sm:text-base">
        {rules.map((rule) => (
          <li key={rule.title}>
            <p className="font-semibold text-white">{rule.title}</p>
            <p className="mt-1">{rule.text}</p>
          </li>
        ))}
      </ul>
    </InfoCard>
  );
}

export default async function CallForJuryPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track } = await searchParams;
  const requested = trackFromQuery(track);
  const [competition, categories] = await Promise.all([
    getCurrentCompetition(),
    new CategoryModel().find({}),
  ]);

  const openTracks = competition
    ? allowedEducationLevels(competition.eligibility)
    : [];
  const requestedClosed = Boolean(requested && !openTracks.includes(requested));
  const tracks = requested && openTracks.includes(requested) ? [requested] : openTracks;
  const categoryOptions = categories.flatMap((category) => {
    const id = toIdString(category._id);
    if (!id || !category.education_level) return [];
    if (!openTracks.includes(category.education_level)) return [];
    return [
      {
        id,
        name: category.name,
        educationLevel: category.education_level,
      },
    ];
  });

  return (
    <ContentPage eyebrow="Join the judging panel" title="Call for Jury">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 text-base leading-relaxed text-white/85">
        <p>
          I-CRIVE 2027 invites experienced academics, industry professionals and
          researchers to serve as judges, and invites subject experts to review
          papers for JTeC.
        </p>
        <p>
          Read the rules below before you apply. An administrator confirms each
          appointment, and you will receive an email when your application is
          received and again if you are appointed.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <RuleList title="Jury" rules={JURY_CALL_RULES} />
        <RuleList title="Paper reviewers" rules={REVIEWER_CALL_RULES} />
      </div>

      <LiquidGlass
        tint={0}
        radius={28}
        className={`mt-10 ${GLASS_CLASS}`}
        style={GLASS_STYLE}
        contentClassName="px-6 py-8 sm:px-10 sm:py-10"
      >
        {!competition || tracks.length === 0 ? (
          <p className="text-center text-white/80">
            Applications are closed until a competition is published.
          </p>
        ) : requestedClosed ? (
          <p className="text-center text-white/80">
            That track is not open for applications.
          </p>
        ) : (
          <>
            <h2 className="text-center text-2xl font-bold">Registration form</h2>
            <p className="mx-auto mt-2 mb-8 max-w-xl text-center text-sm text-white/70">
              Appointed jury members receive an e-certificate of appreciation.
              Reviewers receive an official appointment letter.
            </p>
            <JudgeApplicationForm
              tracks={tracks}
              lockedTrack={Boolean(requested)}
              categories={categoryOptions}
            />
          </>
        )}
      </LiquidGlass>
    </ContentPage>
  );
}
