import { notFound, redirect } from "next/navigation";

import {
  AssessmentWorkspace,
  type AssessmentRegistration,
} from "@/components/AssessmentWorkspace";
import { CategoryModel } from "@/models/Category";
import { CompetitionModel } from "@/models/Competition";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { JudgeCriteriaModel } from "@/models/JudgeCriteria";
import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import { judgeTypesForRoles } from "@/utils/judgeTypes";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { resolveJudgeUser } from "@/utils/resolveJudgeUser";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { serializeJudgeCriteria } from "@/utils/serializeJudgeCriteria";

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePortalSection("my-assignments");
  const judge = await resolveJudgeUser(session);
  if (!judge) {
    redirect("/portal/login");
  }

  const { id } = await params;
  const assignment = await new JudgeAssignmentModel().findById(id);
  if (
    !assignment ||
    toIdString(assignment.judge_id) !== toIdString(judge._id) ||
    !judgeTypesForRoles(judge.roles).includes(assignment.type)
  ) {
    notFound();
  }

  const registration = await new RegistrationModel().findOne({
    registration_number: assignment.registration_number,
  });
  if (!registration) {
    notFound();
  }

  const [competition, category, criteria] = await Promise.all([
    new CompetitionModel().findById(toIdString(registration.competition_id)),
    new CategoryModel().findById(toIdString(registration.category_id)),
    new JudgeCriteriaModel().find(
      { type: assignment.type },
      { sort: { name: 1 } }
    ),
  ]);

  const assessmentRegistration: AssessmentRegistration = {
    registration_number: registration.registration_number,
    competition: competition?.name ?? "—",
    category: category?.name ?? "—",
    created_at: registration.created_at
      ? new Date(registration.created_at).toISOString()
      : undefined,
    participant: {
      name: registration.participant.name,
      email: registration.participant.email,
      education_level: registration.participant.education_level,
      institution: {
        name: registration.participant.institution.name,
        country: registration.participant.institution.country,
      },
    },
    project: {
      title: registration.project.title,
      abstract: registration.project.abstract,
    },
    team: {
      lead: {
        name: registration.team.lead.name,
        email: registration.team.lead.email,
      },
      members: registration.team.members.map((member) => ({
        name: member.name,
        email: member.email,
      })),
    },
    supervisors: registration.supervisors.map((supervisor) => ({
      name: supervisor.name,
      email: supervisor.email,
    })),
    documents: registration.documents.map((doc) => ({
      type: doc.type,
      file_name: doc.file_name,
      file_url: doc.file_url,
    })),
  };

  return (
    <AssessmentWorkspace
      key={toIdString(assignment._id)}
      initialAssignment={serializeJudgeAssignment(assignment)}
      registration={assessmentRegistration}
      criteria={criteria.map(serializeJudgeCriteria)}
    />
  );
}
