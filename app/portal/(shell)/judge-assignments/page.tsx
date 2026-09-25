import { JudgeAssignmentsManager } from "@/components/JudgeAssignmentsManager";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { RegistrationModel } from "@/models/Registration";
import { UserModel } from "@/models/User";
import { toAssignmentRegistrationOption } from "@/utils/assignmentOptions";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { serializeUser } from "@/utils/serializeUser";
import { requirePortalSection } from "@/utils/requirePortalAccess";

async function loadAssignmentData() {
  try {
    const [assignments, users, registrations] = await Promise.all([
      new JudgeAssignmentModel().find({}, { sort: { created_at: -1 } }),
      new UserModel().find(
        {
          roles: { $in: ["THESIS_JUDGE", "EBOOK_JUDGE"] },
        },
        { sort: { email: 1 } }
      ),
      new RegistrationModel().find({}, { sort: { created_at: -1 } }),
    ]);

    return {
      assignments: assignments.map(serializeJudgeAssignment),
      judges: users.map(serializeUser),
      registrations: registrations.map(toAssignmentRegistrationOption),
    };
  } catch {
    return { assignments: [], judges: [], registrations: [] };
  }
}

export default async function JudgeAssignmentsPage() {
  await requirePortalSection("judge-assignments");
  const { assignments, judges, registrations } = await loadAssignmentData();

  return (
    <JudgeAssignmentsManager
      initialAssignments={assignments}
      judges={judges}
      registrations={registrations}
    />
  );
}
