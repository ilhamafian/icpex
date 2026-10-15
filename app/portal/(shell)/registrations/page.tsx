import { PaymentVerificationManager } from "@/components/PaymentVerificationManager";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { loadSubmissionPaymentGroups } from "@/utils/submissionPayments";

export default async function RegistrationsPage() {
  await requirePortalSection("registrations");

  let groups: Awaited<ReturnType<typeof loadSubmissionPaymentGroups>> = [];
  try {
    groups = await loadSubmissionPaymentGroups();
  } catch {
    groups = [];
  }

  return <PaymentVerificationManager initialGroups={groups} />;
}
