import { AuthFormLayout } from "@/components/AuthFormLayout";
import { InviteAcceptForm } from "@/components/InviteAcceptForm";
import { hashInviteToken } from "@/lib/inviteToken";
import { UserModel } from "@/models/User";
import type { UserRole } from "@/schemas/userSchema";

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
      roles: user.roles as UserRole[],
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

  return (
    <AuthFormLayout
      title="Accept invitation"
      subtitle="Verify your email and create a password to activate your account."
      footer="ICPEX"
    >
      <InviteAcceptForm
        token={token}
        email={invite.email}
        roles={invite.roles}
      />
    </AuthFormLayout>
  );
}
