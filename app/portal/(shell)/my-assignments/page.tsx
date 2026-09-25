import { MyAssignmentsManager } from "@/components/MyAssignmentsManager";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { JudgeCriteriaModel } from "@/models/JudgeCriteria";
import { RegistrationModel } from "@/models/Registration";
import type { JudgeAssignmentType } from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";
import { toAssignmentRegistrationOption } from "@/utils/assignmentOptions";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { resolveJudgeUser } from "@/utils/resolveJudgeUser";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { serializeJudgeCriteria } from "@/utils/serializeJudgeCriteria";
import { redirect } from "next/navigation";

function typesForRole(
  roles: string[]
): JudgeAssignmentType[] {
  const types: JudgeAssignmentType[] = [];
  if (roles.includes("THESIS_JUDGE")) types.push("THESIS");
  if (roles.includes("EBOOK_JUDGE")) types.push("EBOOK");
  return types;
}

async function loadMyAssignments(judgeId: string) {
  try {
    const [assignments, criteriaList] = await Promise.all([
      new JudgeAssignmentModel().find(
        { judge_id: judgeId },
        { sort: { type: 1, created_at: -1 } }
      ),
      new JudgeCriteriaModel().find({}, { sort: { type: 1, name: 1 } }),
    ]);

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
      criteria: criteriaList.map(serializeJudgeCriteria),
    };
  } catch {
    return { assignments: [], registrations: [], criteria: [] };
  }
}

export default async function MyAssignmentsPage() {
  const session = await requirePortalSection("my-assignments");
  const judge = await resolveJudgeUser(session);
  if (!judge) {
    redirect("/portal/login");
  }

  const allowedTypes = typesForRole(judge.roles);
  if (allowedTypes.length === 0) {
    redirect("/portal/login");
  }

  const { assignments, registrations, criteria } = await loadMyAssignments(
    toIdString(judge._id)
  );

  return (
    <MyAssignmentsManager
      initialAssignments={assignments}
      registrations={registrations}
      criteria={criteria}
      allowedTypes={allowedTypes}
    />
  );
}
