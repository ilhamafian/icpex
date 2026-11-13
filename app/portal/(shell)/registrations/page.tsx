import { PaymentVerificationManager } from "@/components/PaymentVerificationManager";
import { CategoryModel } from "@/models/Category";
import { toIdString } from "@/schemas/objectId";
import { educationLevelForRole } from "@/schemas/userRole";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { loadSubmissionPaymentGroups } from "@/utils/submissionPayments";
import type { SubmissionPaymentGroup } from "@/utils/submissionPayments";

export default async function RegistrationsPage() {
  const session = await requirePortalSection("registrations");
  const track = educationLevelForRole(session.role);

  let groups: SubmissionPaymentGroup[] = [];
  let categories: { id: string; name: string }[] = [];
  try {
    const [loadedGroups, loadedCategories] = await Promise.all([
      loadSubmissionPaymentGroups(),
      new CategoryModel().getCategories(),
    ]);
    groups = loadedGroups;
    categories = (loadedCategories ?? []).flatMap((category) => {
      const id = toIdString(category._id);
      return id ? [{ id, name: category.name }] : [];
    });
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
      categories={categories}
      lockedEducationLevel={track ?? undefined}
    />
  );
}
