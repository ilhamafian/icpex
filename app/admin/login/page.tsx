import { redirect } from "next/navigation";
import { AuthFormLayout } from "@/components/AuthFormLayout";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getSession } from "@/lib/session";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.role === "admin") {
    redirect("/admin/dashboard");
  }

  return (
    <AuthFormLayout
      title="Admin sign in"
      subtitle="Sign in with your assigned administrator credentials. Admins are not self-registered."
      footer="Internal access only"
    >
      <AdminLoginForm />
    </AuthFormLayout>
  );
}
