import { JudgeAssignmentsManager } from "@/components/JudgeAssignmentsManager";
import { CategoryModel } from "@/models/Category";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { PaymentModel } from "@/models/Payment";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import type { PaymentStatus } from "@/schemas/paymentSchema";
import type { ScoringAudience } from "@/schemas/scoringAudience";
import {
  educationLevelForRole,
  scoringRolesForAudience,
} from "@/schemas/userRole";
import { usersWithRolesFilter } from "@/utils/roleGrants";
import { effectiveDocumentRequirements } from "@/schemas/documentRequirement";
import {
  assignmentDocumentColumns,
  toAssignmentRegistrationOption,
} from "@/utils/assignmentOptions";
import { findRegistrationsForCompetition } from "@/utils/competitionScope";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { serializeUser } from "@/utils/serializeUser";

async function loadAssignmentData(
  competitionId: string | null,
  role: Parameters<typeof educationLevelForRole>[0]
) {
  if (!competitionId) {
    return {
      assignments: [],
      judgesByAudience: { JUDGE: [], PAPER_REVIEWER: [] },
      registrations: [],
      categories: [],
    };
  }

  try {
    const assignmentModel = new JudgeAssignmentModel();
    await assignmentModel.acceptPending();
    await assignmentModel.collapseDuplicates();

    const track = educationLevelForRole(role);
    const userModel = new UserModel();
    const [foundRegistrations, judgeUsers, reviewerUsers, payments, categories] =
      await Promise.all([
      findRegistrationsForCompetition(competitionId),
      userModel.find(
        usersWithRolesFilter(scoringRolesForAudience(track, "JUDGE"), competitionId),
        { sort: { email: 1 } }
      ),
      userModel.find(
        usersWithRolesFilter(
          scoringRolesForAudience(track, "PAPER_REVIEWER"),
          competitionId
        ),
        { sort: { email: 1 } }
      ),
      new PaymentModel().find({}, { sort: { created_at: -1 } }),
      new CategoryModel().find({}),
    ]);

    const registrations = track
      ? foundRegistrations.filter(
          (item) => item.participant.education_level === track
        )
      : foundRegistrations;

    const categoryNames = new Map(
      categories.map((item) => [toIdString(item._id), item.name])
    );

    // Payments are sorted newest first, so the first one seen per registration wins.
    const paymentStatusByRegistration = new Map<string, PaymentStatus>();
    for (const payment of payments) {
      const key = toIdString(payment.registration_id);
      if (!paymentStatusByRegistration.has(key)) {
        paymentStatusByRegistration.set(key, payment.status);
      }
    }

    const assignments = await assignmentModel.find(
      {
        registration_number: {
          $in: registrations.map((item) => item.registration_number),
        },
      },
      { sort: { created_at: -1 } }
    );

    const judgesByAudience: Record<ScoringAudience, ReturnType<typeof serializeUser>[]> = {
      JUDGE: judgeUsers.map(serializeUser),
      PAPER_REVIEWER: reviewerUsers.map(serializeUser),
    };

    return {
      assignments: assignments.map(serializeJudgeAssignment),
      judgesByAudience,
      categories: categories.map((category) => ({
        id: toIdString(category._id),
        name: category.name,
      })),
      registrations: registrations.map((registration) =>
        toAssignmentRegistrationOption(
          registration,
          paymentStatusByRegistration.get(toIdString(registration._id)) ?? null,
          categoryNames.get(toIdString(registration.category_id)) ?? ""
        )
      ),
    };
  } catch {
    return {
      assignments: [],
      judgesByAudience: { JUDGE: [], PAPER_REVIEWER: [] },
      registrations: [],
      categories: [],
    };
  }
}

export default async function JudgeAssignmentsPage() {
  const session = await requirePortalSection("judge-assignments");
  const competition = await getCurrentCompetition();
  const competitionId = competition ? toIdString(competition._id) : null;
  const { assignments, judgesByAudience, registrations, categories } =
    await loadAssignmentData(competitionId, session.role);
  const documentColumns = assignmentDocumentColumns(
    effectiveDocumentRequirements(competition),
    educationLevelForRole(session.role)
  );

  return (
    <JudgeAssignmentsManager
      initialAssignments={assignments}
      judgesByAudience={judgesByAudience}
      categories={categories}
      competitionId={competitionId}
      registrations={registrations}
      documentColumns={documentColumns}
      judgingDueDate={
        competition?.judging_due_date
          ? new Date(competition.judging_due_date).toISOString()
          : null
      }
    />
  );
}
