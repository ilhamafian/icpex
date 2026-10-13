import { JudgeAssignmentsManager } from "@/components/JudgeAssignmentsManager";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { PaymentModel } from "@/models/Payment";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import type { PaymentStatus } from "@/schemas/paymentSchema";
import { toAssignmentRegistrationOption } from "@/utils/assignmentOptions";
import { findRegistrationsForCompetition } from "@/utils/competitionScope";
import { getCurrentCompetitionId } from "@/utils/currentCompetition";
import { JUDGE_ROLES } from "@/utils/portalAuth";
import { usersWithRolesFilter } from "@/utils/roleGrants";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { serializeUser } from "@/utils/serializeUser";
import { requirePortalSection } from "@/utils/requirePortalAccess";

async function loadAssignmentData(competitionId: string | null) {
  if (!competitionId) {
    return { assignments: [], judges: [], registrations: [] };
  }

  try {
    const [registrations, users, payments] = await Promise.all([
      findRegistrationsForCompetition(competitionId),
      new UserModel().find(usersWithRolesFilter(JUDGE_ROLES, competitionId), {
        sort: { email: 1 },
      }),
      new PaymentModel().find({}, { sort: { created_at: -1 } }),
    ]);

    // Payments are sorted newest first, so the first one seen per registration wins.
    const paymentStatusByRegistration = new Map<string, PaymentStatus>();
    for (const payment of payments) {
      const key = toIdString(payment.registration_id);
      if (!paymentStatusByRegistration.has(key)) {
        paymentStatusByRegistration.set(key, payment.status);
      }
    }

    const assignments = await new JudgeAssignmentModel().find(
      {
        registration_number: {
          $in: registrations.map((item) => item.registration_number),
        },
      },
      { sort: { created_at: -1 } }
    );

    return {
      assignments: assignments.map(serializeJudgeAssignment),
      judges: users.map(serializeUser),
      registrations: registrations.map((registration) =>
        toAssignmentRegistrationOption(
          registration,
          paymentStatusByRegistration.get(toIdString(registration._id)) ?? null
        )
      ),
    };
  } catch {
    return { assignments: [], judges: [], registrations: [] };
  }
}

export default async function JudgeAssignmentsPage() {
  await requirePortalSection("judge-assignments");
  const competitionId = await getCurrentCompetitionId();
  const { assignments, judges, registrations } =
    await loadAssignmentData(competitionId);

  return (
    <JudgeAssignmentsManager
      initialAssignments={assignments}
      judges={judges}
      competitionId={competitionId}
      registrations={registrations}
    />
  );
}
