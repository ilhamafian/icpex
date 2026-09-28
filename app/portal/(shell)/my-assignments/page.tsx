import { MyAssignmentsManager } from "@/components/MyAssignmentsManager";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import { toAssignmentRegistrationOption } from "@/utils/assignmentOptions";
import { judgeTypesForRoles } from "@/utils/judgeTypes";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { resolveJudgeUser } from "@/utils/resolveJudgeUser";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { redirect } from "next/navigation";

async function loadMyAssignments(judgeId: string) {
  try {
    const assignments = await new JudgeAssignmentModel().find(
      { judge_id: judgeId },
      { sort: { created_at: -1 } }
    );

    const registrationNumbers = [
      ...new Set(assignments.map((item) => item.registration_number)),
    ];

    const registrations =
      registrationNumbers.length === 0
        ? []
        : await new RegistrationModel().find({
            registration_number: { $in: registrationNumbers },
          });

    return {
      assignments: assignments.map(serializeJudgeAssignment),
      registrations: registrations.map(toAssignmentRegistrationOption),
    };
  } catch {
    return { assignments: [], registrations: [] };
  }
}

export default async function MyAssignmentsPage() {
  const session = await requirePortalSection("my-assignments");
  const judge = await resolveJudgeUser(session);
  if (!judge) {
    redirect("/portal/login");
  }

  const allowedTypes = judgeTypesForRoles(judge.roles);
  if (allowedTypes.length === 0) {
    redirect("/portal/login");
  }

  const { assignments, registrations } = await loadMyAssignments(
    toIdString(judge._id)
  );

  return (
    <MyAssignmentsManager
      initialAssignments={assignments}
      registrations={registrations}
      allowedTypes={allowedTypes}
    />
  );
}
