import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthFormLayout } from "@/components/AuthFormLayout";
import { PortalLoginForm } from "@/components/PortalLoginForm";
import { getSession, SESSION_COOKIE } from "@/lib/session";
import { getHomePathForRole } from "@/utils/portalHome";

export default async function PortalLoginPage() {
  const session = await getSession();
  if (session) {
    redirect(getHomePathForRole(session.role));
  }

  const hadSession = Boolean((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <AuthFormLayout
      title="Sign in"
      subtitle="Sign in with your credentials. Invited users use the email from their invitation."
      footer="Internal access only"
    >
      {hadSession ? (
        <p className="mb-4 rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
          Your session has ended. You may not have a role in the current
          competition — contact an administrator if you need access.
        </p>
      ) : null}
      <PortalLoginForm />
    </AuthFormLayout>
  );
}
