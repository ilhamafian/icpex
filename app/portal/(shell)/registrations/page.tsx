import { PaymentVerificationManager } from "@/components/PaymentVerificationManager";
import { educationLevelForRole } from "@/schemas/userRole";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { loadSubmissionPaymentGroups } from "@/utils/submissionPayments";
import type { SubmissionPaymentGroup } from "@/utils/submissionPayments";

export default async function RegistrationsPage() {
  const session = await requirePortalSection("registrations");
  const track = educationLevelForRole(session.role);

  let groups: SubmissionPaymentGroup[] = [];
  try {
    groups = await loadSubmissionPaymentGroups();
  } catch {
    groups = [];
  }

  if (track) {
    groups = groups
      .map((group) => ({
        ...group,
        projects: group.projects.filter(
          (project) => project.registration.participant.education_level === track
        ),
      }))
      .filter((group) => group.projects.length > 0);
  }

  return (
    <PaymentVerificationManager
      initialGroups={groups}
      lockedEducationLevel={track ?? undefined}
    />
  );
}
