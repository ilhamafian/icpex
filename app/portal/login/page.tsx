import { redirect } from "next/navigation";
import { AuthFormLayout } from "@/components/AuthFormLayout";
import { PortalLoginForm } from "@/components/PortalLoginForm";
import { getSession } from "@/lib/session";
import { getHomePathForRole } from "@/utils/portalHome";

export default async function PortalLoginPage() {
  const session = await getSession();
  if (session) {
    redirect(getHomePathForRole(session.role));
  }

  return (
    <AuthFormLayout
      title="Sign in"
      subtitle="Sign in with your role and credentials. Invited users use the email from their invitation."
      footer="Internal access only"
    >
      <PortalLoginForm />
    </AuthFormLayout>
  );
}
