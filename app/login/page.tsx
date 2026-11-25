import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthFormLayout } from "@/components/AuthFormLayout";
import { ParticipantLoginForm } from "@/components/participant-auth-forms";
import { safeParticipantNext } from "@/lib/participantNext";
import { getParticipantSession } from "@/lib/participantSession";

export default async function ParticipantLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verified?: string; verify?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const next = safeParticipantNext(params.next);
  const session = await getParticipantSession();
  if (session) redirect(next);

  const notice =
    params.verified === "1"
      ? "Email verified. You can sign in."
      : params.reset === "1"
        ? "Password updated. You can sign in."
        : params.verify === "invalid"
          ? "That verification link is invalid or has expired."
          : null;

  return (
    <AuthFormLayout
      title="Sign in"
      subtitle="Participant access for I-CRIVE 2027 registrations."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {notice ? (
        <p
          className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
            params.verify === "invalid"
              ? "border-red-300/40 text-red-300"
              : "border-white/15 bg-[#07111d]/45 text-white/80"
          }`}
        >
          {notice}
        </p>
      ) : null}
      <ParticipantLoginForm next={next} />
    </AuthFormLayout>
  );
}
