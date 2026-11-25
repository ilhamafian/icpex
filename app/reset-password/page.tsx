import Link from "next/link";

import { AuthFormLayout } from "@/components/AuthFormLayout";
import { ParticipantResetForm } from "@/components/participant-auth-forms";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthFormLayout
      title="Choose a new password"
      subtitle="This link expires one hour after it was sent."
      footer={
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      }
    >
      {token ? (
        <ParticipantResetForm token={token} />
      ) : (
        <p className="text-sm text-red-300">
          This reset link is invalid. Request a new one from the sign-in page.
        </p>
      )}
    </AuthFormLayout>
  );
}
