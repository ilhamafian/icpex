import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthFormLayout } from "@/components/AuthFormLayout";
import { ParticipantSignupForm } from "@/components/participant-auth-forms";
import { getParticipantSession } from "@/lib/participantSession";

export default async function ParticipantSignupPage() {
  const session = await getParticipantSession();
  if (session) redirect("/my");

  return (
    <AuthFormLayout
      title="Create an account"
      subtitle="Verify your email before you register a project."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ParticipantSignupForm />
    </AuthFormLayout>
  );
}
