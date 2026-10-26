import { NextRequest } from "next/server";

import { hashInviteToken } from "@/lib/inviteToken";
import { hashPassword } from "@/lib/password";
import { CategoryModel } from "@/models/Category";
import { UserModel } from "@/models/User";
import { judgeProfileSchema } from "@/schemas/judgeProfileSchema";
import { toIdString } from "@/schemas/objectId";
import { acceptInviteSchema } from "@/schemas/userSchema";
import { sortRoles } from "@/schemas/userRole";
import { createResponse, handleError } from "@/utils/apiHelper";
import { normalizeInstitution } from "@/utils/institutionKey";
import { isScoringJudgeRole } from "@/utils/judgeTypes";

function firstIssueMessage(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return createResponse({ error: "Missing invite token." }, 400);
    }

    const model = new UserModel();
    const user = await model.findByInviteTokenHash(hashInviteToken(token));
    if (!user || user.status !== "INVITED") {
      return createResponse({ error: "Invalid or expired invitation." }, 404);
    }

    if (
      user.invite_expires_at &&
      new Date(user.invite_expires_at).getTime() < Date.now()
    ) {
      return createResponse({ error: "This invitation has expired." }, 410);
    }

    return createResponse({
      email: user.email,
      roles: sortRoles(user.roles.map((grant) => grant.role)),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = acceptInviteSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: firstIssueMessage(parsed.error) }, 400);
    }

    const model = new UserModel();
    const user = await model.findByInviteTokenHash(
      hashInviteToken(parsed.data.token)
    );

    if (!user || user.status !== "INVITED") {
      return createResponse({ error: "Invalid or expired invitation." }, 404);
    }

    if (
      user.invite_expires_at &&
      new Date(user.invite_expires_at).getTime() < Date.now()
    ) {
      return createResponse({ error: "This invitation has expired." }, 410);
    }

    const scoringJudge = user.roles.some((grant) =>
      isScoringJudgeRole(grant.role)
    );

    let judge_profile;
    if (scoringJudge) {
      if (!parsed.data.judge_profile) {
        return createResponse(
          {
            error:
              "Judges must provide a university, national ID, categories, and education level.",
          },
          400
        );
      }

      const institution_key = normalizeInstitution(
        parsed.data.judge_profile.institution.name
      );
      if (!institution_key) {
        return createResponse({ error: "University is required." }, 400);
      }

      const requestedIds = [
        ...new Set(
          parsed.data.judge_profile.category_ids.map((id) => toIdString(id))
        ),
      ];
      const categories = await new CategoryModel().find({});
      const known = new Map(
        categories.map((category) => [
          toIdString(category._id).toLowerCase(),
          toIdString(category._id),
        ])
      );
      const category_ids: string[] = [];
      for (const id of requestedIds) {
        const canonical = known.get(id.toLowerCase());
        if (!canonical) {
          return createResponse(
            { error: "Select a category from the list." },
            400
          );
        }
        category_ids.push(canonical);
      }

      judge_profile = judgeProfileSchema.parse({
        ...parsed.data.judge_profile,
        category_ids,
        institution_key,
      });
    }

    const password_hash = await hashPassword(parsed.data.password);
    const id = toIdString(user._id);

    await model.activateFromInvite(id, {
      password_hash,
      name: parsed.data.name,
      judge_profile,
    });

    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
