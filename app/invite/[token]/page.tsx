import { AuthFormLayout } from "@/components/AuthFormLayout";
import {
  InviteAcceptForm,
  type InviteCategory,
} from "@/components/InviteAcceptForm";
import { hashInviteToken } from "@/lib/inviteToken";
import { CategoryModel } from "@/models/Category";
import { UserModel } from "@/models/User";
import { categoryMatchesEligibility } from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import {
  educationEligibilityForJudgeRoles,
  sortRoles,
} from "@/schemas/userRole";
import { isScoringRole } from "@/utils/judgeTypes";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

async function loadInvite(token: string) {
  try {
    const user = await new UserModel().findByInviteTokenHash(
      hashInviteToken(token)
    );
    if (!user || user.status !== "INVITED") {
      return { error: "invalid" as const };
    }
    if (
      user.invite_expires_at &&
      new Date(user.invite_expires_at).getTime() < Date.now()
    ) {
      return { error: "expired" as const };
    }
    return {
      email: user.email,
      roles: sortRoles(user.roles.map((grant) => grant.role)),
    };
  } catch {
    return { error: "invalid" as const };
  }
}

export default async function InviteAcceptPage({ params }: InvitePageProps) {
  const { token } = await params;
  const invite = await loadInvite(token);

  if ("error" in invite) {
    const message =
      invite.error === "expired"
        ? "This invitation has expired. Ask an administrator to send a new one."
        : "This invitation link is invalid or has already been used.";

    return (
      <AuthFormLayout
        title="Invitation unavailable"
        subtitle={message}
        footer="ICPEX"
      >
        <div />
      </AuthFormLayout>
    );
  }

  let categories: InviteCategory[] = [];
  if (invite.roles.some((role) => isScoringRole(role))) {
    try {
      const eligibility = educationEligibilityForJudgeRoles(invite.roles);
      const rows = await new CategoryModel().find({}, { sort: { name: 1 } });
      categories = rows.flatMap((category) => {
        const id = toIdString(category._id);
        const education_level = category.education_level;
        if (
          !id ||
          !education_level ||
          !categoryMatchesEligibility(education_level, eligibility)
        ) {
          return [];
        }
        return [{ id, name: category.name, education_level }];
      });
    } catch {
      categories = [];
    }
  }

  return (
    <InviteAcceptForm
      token={token}
      email={invite.email}
      roles={invite.roles}
      categories={categories}
    />
  );
}
