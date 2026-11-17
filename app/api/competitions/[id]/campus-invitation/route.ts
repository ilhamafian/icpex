import { NextRequest } from "next/server";
import { z } from "zod";

import { getAppOrigin } from "@/lib/appOrigin";
import {
  competitionEmailCopy,
  sendCampusInvitationEmail,
  streamNameForLevel,
} from "@/lib/email";
import { CategoryModel } from "@/models/Category";
import { CompetitionModel } from "@/models/Competition";
import { effectiveDocumentRequirements } from "@/schemas/documentRequirement";
import {
  allowedEducationLevels,
  DEFAULT_COMPETITION_ELIGIBILITY,
  trackSectionLabel,
  type EducationLevel,
} from "@/schemas/educationLevel";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSuperAdminSession } from "@/utils/portalAuth";
import { emailEach } from "@/utils/submissionPayments";

const MAX_RECIPIENTS = 200;
const MAX_POSTER_BYTES = 10 * 1024 * 1024;

const emailSchema = z.email();

function formatEmailDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Split pasted or CSV-ish recipient text into unique valid emails. */
function parseRecipients(raw: string) {
  const candidates = raw
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const candidate of [...new Set(candidates)]) {
    if (emailSchema.safeParse(candidate).success) {
      emails.push(candidate);
    } else {
      invalid.push(candidate);
    }
  }
  return { emails, invalid };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const competition = await new CompetitionModel().findById(id);
    if (!competition) {
      return createResponse({ error: "Competition not found" }, 404);
    }

    const form = await req.formData();
    const recipientsRaw = String(form.get("recipients") ?? "");
    const registerUrlRaw = String(form.get("registerUrl") ?? "").trim();
    const posterEntry = form.get("poster");

    const { emails, invalid } = parseRecipients(recipientsRaw);
    if (invalid.length > 0) {
      return createResponse(
        { error: `Invalid email address: ${invalid[0]}` },
        400
      );
    }
    if (emails.length === 0) {
      return createResponse(
        { error: "Add at least one recipient email address." },
        400
      );
    }
    if (emails.length > MAX_RECIPIENTS) {
      return createResponse(
        { error: `Send to at most ${MAX_RECIPIENTS} recipients at a time.` },
        400
      );
    }

    let poster:
      | { filename: string; content: Buffer; contentType?: string }
      | undefined;
    if (posterEntry instanceof File && posterEntry.size > 0) {
      if (posterEntry.size > MAX_POSTER_BYTES) {
        return createResponse(
          { error: "Poster must be 10 MB or smaller." },
          400
        );
      }
      poster = {
        filename: posterEntry.name || `${competition.name}-poster`,
        content: Buffer.from(await posterEntry.arrayBuffer()),
        contentType: posterEntry.type || undefined,
      };
    }

    const origin = await getAppOrigin();
    const registerUrl = registerUrlRaw || origin;
    const copy = competitionEmailCopy(competition);
    const categories = await new CategoryModel().find({}, { sort: { name: 1 } });
    const eligibility =
      competition.eligibility ?? DEFAULT_COMPETITION_ELIGIBILITY;
    const streams = allowedEducationLevels(eligibility);
    const participationStreams = streams.map((level) =>
      streamNameForLevel(copy, level)
    );
    const trackSections = streams.map((level: EducationLevel) => ({
      heading: trackSectionLabel(level),
      tracks: categories
        .filter((category) => category.education_level === level)
        .map((category) => category.name),
    }));
    const registrationPeriod = `${formatEmailDate(competition.start_date)} – ${formatEmailDate(competition.end_date)}`;

    const documentRequirements = effectiveDocumentRequirements(competition);

    const delivery = await emailEach(emails, (to) =>
      sendCampusInvitationEmail({
        to,
        copy,
        registerUrl,
        registrationPeriod,
        participationStreams,
        trackSections,
        documentRequirements,
        poster,
      })
    );

    if (delivery.sent === 0) {
      return createResponse(
        { error: "Failed to send the participant invitation email." },
        502
      );
    }

    return createResponse({
      sent: delivery.sent,
      failed: delivery.failed,
      total: delivery.total,
      warning:
        delivery.failed > 0
          ? `Sent to ${delivery.sent} of ${delivery.total} recipients.`
          : undefined,
    });
  } catch (error) {
    return handleError(error);
  }
}
