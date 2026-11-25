import { NextRequest } from "next/server";

import { getAppOrigin } from "@/lib/appOrigin";
import {
  competitionEmailCopy,
  sendJudgeApplicationAdminEmail,
  sendJudgeApplicationReceivedEmail,
} from "@/lib/email";
import { hashPassword } from "@/lib/password";
import { CategoryModel } from "@/models/Category";
import { UserModel } from "@/models/User";
import {
  allowedEducationLevels,
  categoryMatchesEligibility,
} from "@/schemas/educationLevel";
import {
  judgeApplicationFormSchema,
  judgeApplicationSchema,
} from "@/schemas/judgeApplicationSchema";
import {
  judgeProfileInputSchema,
  judgeProfileSchema,
} from "@/schemas/judgeProfileSchema";
import { toIdString } from "@/schemas/objectId";
import { userSchema } from "@/schemas/userSchema";
import {
  judgeRoleForEducation,
  reviewerRoleForEducation,
  type UserRole,
} from "@/schemas/userRole";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { normalizeInstitution } from "@/utils/institutionKey";
import { usersWithRolesFilter } from "@/utils/roleGrants";

function firstIssueMessage(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

function roleForApplication(
  kind: "JUDGE" | "REVIEWER",
  level: "UNDERGRADUATE" | "POSTGRADUATE"
): UserRole {
  return kind === "REVIEWER"
    ? reviewerRoleForEducation(level)
    : judgeRoleForEducation(level);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = judgeApplicationFormSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: firstIssueMessage(parsed.error) }, 400);
    }

    const competition = await getCurrentCompetition();
    if (!competition) {
      return createResponse(
        { error: "Applications are closed until a competition is published." },
        400
      );
    }

    const level = parsed.data.education_level;
    if (!allowedEducationLevels(competition.eligibility).includes(level)) {
      return createResponse(
        { error: "That track is not open for applications." },
        400
      );
    }

    const institution_key = normalizeInstitution(parsed.data.institution.name);
    if (!institution_key) {
      return createResponse({ error: "Organisation is required." }, 400);
    }

    const requestedIds = [
      ...new Set(parsed.data.category_ids.map((id) => toIdString(id))),
    ];
    const categories = await new CategoryModel().find({});
    const known = new Map(
      categories.flatMap((category) => {
        const id = toIdString(category._id);
        if (!id || !categoryMatchesEligibility(category.education_level, level)) {
          return [];
        }
        return [[id.toLowerCase(), id] as const];
      })
    );
    const category_ids: string[] = [];
    for (const id of requestedIds) {
      const canonical = known.get(id.toLowerCase());
      if (!canonical) {
        return createResponse(
          { error: "Select a category from your track." },
          400
        );
      }
      category_ids.push(canonical);
    }

    const profileInput = judgeProfileInputSchema.safeParse({
      institution: parsed.data.institution,
      national_id: parsed.data.national_id,
      category_ids,
      education_eligibility: level,
    });
    if (!profileInput.success) {
      return createResponse({ error: firstIssueMessage(profileInput.error) }, 400);
    }

    const judge_profile = judgeProfileSchema.parse({
      ...profileInput.data,
      category_ids,
      institution_key,
      education_eligibility: level,
    });

    const experience = parsed.data.jury_experience?.trim();
    const judge_application = judgeApplicationSchema.parse({
      kind: parsed.data.kind,
      title: parsed.data.title,
      address: parsed.data.address,
      postcode: parsed.data.postcode,
      phone: parsed.data.phone,
      field_of_expertise: parsed.data.field_of_expertise,
      ...(parsed.data.kind === "JUDGE" && experience
        ? { jury_experience: experience }
        : {}),
      cv_url: parsed.data.cv_url,
      cv_file_name: parsed.data.cv_file_name,
      declaration_accepted: true,
    });

    const email = parsed.data.email.toLowerCase();
    const model = new UserModel();
    const existing = await model.findByEmail(email);
    if (existing) {
      if (existing.status === "PENDING_APPROVAL") {
        return createResponse(
          { error: "This email already has an application waiting for approval." },
          409
        );
      }
      if (existing.status === "DISABLED") {
        return createResponse(
          { error: "This email cannot be used to apply. Contact the secretariat." },
          409
        );
      }
      return createResponse(
        { error: "This email already has an account." },
        409
      );
    }

    const competitionId = toIdString(competition._id);
    const role = roleForApplication(parsed.data.kind, level);
    const password_hash = await hashPassword(parsed.data.password);
    const created = userSchema.parse({
      email,
      name: parsed.data.name.trim(),
      password_hash,
      roles: [{ role, competition_id: competitionId }],
      status: "PENDING_APPROVAL",
      email_verified: false,
      judge_profile,
      judge_application,
    });
    await model.create(created);

    const copy = competitionEmailCopy(competition);
    try {
      await sendJudgeApplicationReceivedEmail({
        to: email,
        name: parsed.data.name.trim(),
        role,
        copy,
      });
    } catch (error) {
      console.error("Application confirmation email failed:", error);
    }

    try {
      const adminRole: UserRole =
        level === "POSTGRADUATE" ? "POSTGRAD_ADMIN" : "UNDERGRAD_ADMIN";
      const secretariatRole: UserRole =
        level === "POSTGRADUATE"
          ? "POSTGRAD_SECRETARIAT"
          : "UNDERGRAD_SECRETARIAT";
      let recipients = await model.find({
        status: "ACTIVE",
        ...usersWithRolesFilter([adminRole], competitionId),
      });
      if (recipients.length === 0) {
        recipients = await model.find({
          status: "ACTIVE",
          ...usersWithRolesFilter([secretariatRole], competitionId),
        });
      }

      const origin = await getAppOrigin();
      const reviewUrl = `${origin}/portal/users`;
      await Promise.all(
        recipients.map((recipient) =>
          sendJudgeApplicationAdminEmail({
            to: recipient.email,
            applicantName: parsed.data.name.trim(),
            applicantEmail: email,
            role,
            copy,
            reviewUrl,
          }).catch((error) => {
            console.error("Application notice email failed:", error);
          })
        )
      );
    } catch (error) {
      console.error("Application notice email failed:", error);
    }

    return createResponse({ ok: true }, 201);
  } catch (error) {
    return handleError(error);
  }
}
