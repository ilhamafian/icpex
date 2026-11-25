import Link from "next/link";

import { AuthFormLayout } from "@/components/AuthFormLayout";
import { ParticipantForgotForm } from "@/components/participant-auth-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthFormLayout
      title="Forgot password"
      subtitle="We will email a link to choose a new password."
      footer={
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ParticipantForgotForm />
    </AuthFormLayout>
  );
}
