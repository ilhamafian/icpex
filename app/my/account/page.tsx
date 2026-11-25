import { ParticipantPasswordForm } from "@/components/participant-auth-forms";
import { getParticipantSession } from "@/lib/participantSession";

export default async function ParticipantAccountPage() {
  const session = await getParticipantSession();

  return (
    <div className="px-4 lg:px-6">
      <h2 className="text-2xl font-semibold tracking-tight">Account</h2>
      <p className="mt-1 text-sm text-white/70">{session?.email}</p>
      <div className="mt-8">
        <ParticipantPasswordForm />
      </div>
    </div>
  );
}
