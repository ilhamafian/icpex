import { redirect } from "next/navigation";
import { AuthFormLayout } from "@/components/AuthFormLayout";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getSession } from "@/lib/session";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/admin/dashboard");
  }

  return (
    <AuthFormLayout
      title="Sign in"
      subtitle="Sign in with your role and credentials. Invited users use the email from their invitation."
      footer="Internal access only"
    >
      <AdminLoginForm />
    </AuthFormLayout>
  );
}
