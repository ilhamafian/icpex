import { redirect } from "next/navigation";

import { safeParticipantNext } from "@/lib/participantNext";
import { getParticipantSession } from "@/lib/participantSession";
import { parseLevelParam } from "@/utils/registrationLinks";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level } = await searchParams;
  const requested = parseLevelParam(level);
  const destination = requested
    ? `/my/register?level=${requested.toLowerCase()}`
    : "/my/register";
  const session = await getParticipantSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(safeParticipantNext(destination))}`);
  }
  redirect(destination);
}
