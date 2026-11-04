import "server-only";

import { ObjectId, type Filter } from "mongodb";

import { CategoryModel } from "@/models/Category";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { JudgeCriteriaModel } from "@/models/JudgeCriteria";
import { UserModel } from "@/models/User";
import type { EducationLevel } from "@/schemas/educationLevel";
import type {
  JudgeAssignmentStatus,
  JudgeAssignmentType,
  JudgeScore,
} from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";
import type { User } from "@/schemas/userSchema";
import {
  educationLevelForRole,
  judgeRoleForEducation,
  SCORING_JUDGE_ROLES,
  type UserRole,
} from "@/schemas/userRole";
import { findRegistrationsForCompetition } from "@/utils/competitionScope";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { usersWithRolesFilter } from "@/utils/roleGrants";
import { serializeJudgeCriteria } from "@/utils/serializeJudgeCriteria";
import type { SerializedJudgeCriteria } from "@/utils/serializeJudgeCriteria";

export type ParticipantMarkScore = {
  criteria_id: string;
  criteria_name: string;
  score: number;
  comments: string;
};

export type ParticipantMarkJudge = {
  assignment_id: string;
  judge_id: string;
  judge_name: string;
  type: JudgeAssignmentType;
  status: JudgeAssignmentStatus;
  total_score: number;
  submitted: boolean;
  scores: ParticipantMarkScore[];
};

export type ParticipantMarkRow = {
  registration_number: string;
  participant_name: string;
  institution_name: string;
  category_name: string;
  project_title: string;
  education_level: EducationLevel;
  judges: ParticipantMarkJudge[];
  average_score: number | null;
};

export type JudgeDistributionParticipant = {
  registration_number: string;
  participant_name: string;
  project_title: string;
  category_name: string;
  type: JudgeAssignmentType;
  status: JudgeAssignmentStatus;
  total_score: number;
  submitted: boolean;
};

export type JudgeDistributionRow = {
  judge_id: string;
  name: string;
  email: string;
  institution: string;
  /** Unique participants with a non-declined assignment. */
  participant_count: number;
  thesis_count: number;
  jtec_count: number;
  scored_count: number;
  awaiting_count: number;
  declined_count: number;
  participants: JudgeDistributionParticipant[];
};

export type JudgeLeaderReport = {
  competition_name: string | null;
  marks: ParticipantMarkRow[];
  distribution: JudgeDistributionRow[];
  unassigned_participants: number;
};

export function emptyJudgeLeaderReport(): JudgeLeaderReport {
  return {
    competition_name: null,
    marks: [],
    distribution: [],
    unassigned_participants: 0,
  };
}

function displayName(user: { name?: string; email: string }) {
  const name = user.name?.trim();
  return name || user.email;
}

function roundAverage(total: number, count: number) {
  return Math.round((total / count) * 100) / 100;
}

function isActive(status: JudgeAssignmentStatus) {
  return status !== "REJECTED";
}

async function findUsersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const clauses = ids.flatMap((id) =>
    ObjectId.isValid(id)
      ? [{ _id: new ObjectId(id) }, { _id: id }]
      : [{ _id: id }]
  );
  return new UserModel().find({ $or: clauses } as Filter<User>);
}

function scoresForAssignment(
  assignmentScores: JudgeScore[],
  submitted: boolean,
  criteria: SerializedJudgeCriteria[]
): ParticipantMarkScore[] {
  if (!submitted) return [];
  const byId = new Map(
    assignmentScores.map((score) => [toIdString(score.criteria_id), score])
  );
  const rows: ParticipantMarkScore[] = [];
  const seen = new Set<string>();
  for (const item of criteria) {
    const score = byId.get(item._id);
    if (!score) continue;
    seen.add(item._id);
    rows.push({
      criteria_id: item._id,
      criteria_name: item.name,
      score: score.score,
      comments: score.comments ?? "",
    });
  }
  for (const score of assignmentScores) {
    const id = toIdString(score.criteria_id);
    if (seen.has(id)) continue;
    rows.push({
      criteria_id: id,
      criteria_name: "Removed criterion",
      score: score.score,
      comments: score.comments ?? "",
    });
  }
  return rows;
}

export async function loadJudgeLeaderReport(
  role: UserRole
): Promise<JudgeLeaderReport> {
  const competition = await getCurrentCompetition();
  if (!competition) return emptyJudgeLeaderReport();

  const competitionId = toIdString(competition._id);
  const track = educationLevelForRole(role);
  const judgeRoles = track
    ? [judgeRoleForEducation(track)]
    : [...SCORING_JUDGE_ROLES];

  const [foundRegistrations, assignedJudges, categories, criteriaDocs] =
    await Promise.all([
      findRegistrationsForCompetition(competitionId),
      new UserModel().find(usersWithRolesFilter(judgeRoles, competitionId), {
        sort: { name: 1, email: 1 },
      }),
      new CategoryModel().find({}),
      new JudgeCriteriaModel().find(
        {},
        { sort: { created_at: 1, name: 1 } }
      ),
    ]);

  const registrations = track
    ? foundRegistrations.filter(
        (registration) => registration.participant.education_level === track
      )
    : foundRegistrations;

  const registrationNumbers = registrations.map(
    (registration) => registration.registration_number
  );
  const assignments =
    registrationNumbers.length === 0
      ? []
      : await new JudgeAssignmentModel().find({
          registration_number: { $in: registrationNumbers },
        });

  const judgesById = new Map(
    assignedJudges.map((judge) => [toIdString(judge._id), judge])
  );
  const missingJudgeIds = [
    ...new Set(
      assignments
        .map((assignment) => toIdString(assignment.judge_id))
        .filter((id) => !judgesById.has(id))
    ),
  ];
  const extraJudges = await findUsersByIds(missingJudgeIds);
  for (const judge of extraJudges) {
    judgesById.set(toIdString(judge._id), judge);
  }

  const categoryNames = new Map(
    categories.map((category) => [toIdString(category._id), category.name])
  );
  const criteria = criteriaDocs.map(serializeJudgeCriteria);
  const criteriaByType: Record<JudgeAssignmentType, SerializedJudgeCriteria[]> =
    {
      THESIS: criteria.filter((item) => item.type === "THESIS"),
      JTEC: criteria.filter((item) => item.type === "JTEC"),
    };

  function judgeName(judgeId: string) {
    const judge = judgesById.get(judgeId);
    return judge ? displayName(judge) : "Unknown judge";
  }

  const assignmentsByRegistration = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const list =
      assignmentsByRegistration.get(assignment.registration_number) ?? [];
    list.push(assignment);
    assignmentsByRegistration.set(assignment.registration_number, list);
  }

  const marks: ParticipantMarkRow[] = registrations.map((registration) => {
    const registrationAssignments =
      assignmentsByRegistration.get(registration.registration_number) ?? [];
    const judges: ParticipantMarkJudge[] = registrationAssignments.map(
      (assignment) => {
        const judgeId = toIdString(assignment.judge_id);
        const submitted = Boolean(assignment.submitted_at);
        return {
          assignment_id: toIdString(assignment._id),
          judge_id: judgeId,
          judge_name: judgeName(judgeId),
          type: assignment.type,
          status: assignment.status,
          total_score: assignment.total_score ?? 0,
          submitted,
          scores: scoresForAssignment(
            assignment.scores ?? [],
            submitted,
            criteriaByType[assignment.type] ?? []
          ),
        };
      }
    );
    const scored = judges.filter(
      (judge) => judge.submitted && isActive(judge.status)
    );
    return {
      registration_number: registration.registration_number,
      participant_name: registration.participant.name,
      institution_name: registration.participant.institution.name,
      category_name:
        categoryNames.get(toIdString(registration.category_id)) ?? "—",
      project_title: registration.project.title,
      education_level: registration.participant.education_level,
      judges,
      average_score: scored.length
        ? roundAverage(
            scored.reduce((sum, judge) => sum + judge.total_score, 0),
            scored.length
          )
        : null,
    };
  });

  const distributionByJudge = new Map<string, JudgeDistributionRow>();
  function ensureJudge(judgeId: string): JudgeDistributionRow {
    const existing = distributionByJudge.get(judgeId);
    if (existing) return existing;
    const judge = judgesById.get(judgeId);
    const row: JudgeDistributionRow = {
      judge_id: judgeId,
      name: judge ? displayName(judge) : "Unknown judge",
      email: judge?.email ?? "",
      institution: judge?.judge_profile?.institution?.name ?? "",
      participant_count: 0,
      thesis_count: 0,
      jtec_count: 0,
      scored_count: 0,
      awaiting_count: 0,
      declined_count: 0,
      participants: [],
    };
    distributionByJudge.set(judgeId, row);
    return row;
  }

  for (const judge of assignedJudges) {
    ensureJudge(toIdString(judge._id));
  }

  const registrationByNumber = new Map(
    registrations.map((registration) => [
      registration.registration_number,
      registration,
    ])
  );

  for (const assignment of assignments) {
    const judgeId = toIdString(assignment.judge_id);
    const row = ensureJudge(judgeId);
    const registration = registrationByNumber.get(
      assignment.registration_number
    );
    row.participants.push({
      registration_number: assignment.registration_number,
      participant_name: registration?.participant.name ?? "Unknown participant",
      project_title: registration?.project.title ?? "",
      category_name: registration
        ? (categoryNames.get(toIdString(registration.category_id)) ?? "—")
        : "—",
      type: assignment.type,
      status: assignment.status,
      total_score: assignment.total_score ?? 0,
      submitted: Boolean(assignment.submitted_at),
    });
    if (!isActive(assignment.status)) {
      row.declined_count += 1;
      continue;
    }
    if (assignment.type === "THESIS") row.thesis_count += 1;
    else row.jtec_count += 1;
    if (assignment.submitted_at) row.scored_count += 1;
    else row.awaiting_count += 1;
  }

  const distribution = [...distributionByJudge.values()]
    .map((row) => {
      const activeNumbers = new Set(
        row.participants
          .filter((participant) => isActive(participant.status))
          .map((participant) => participant.registration_number)
      );
      row.participants.sort((a, b) =>
        a.registration_number.localeCompare(b.registration_number) ||
        a.type.localeCompare(b.type)
      );
      return { ...row, participant_count: activeNumbers.size };
    })
    .sort(
      (a, b) =>
        b.participant_count - a.participant_count ||
        a.name.localeCompare(b.name)
    );

  const unassigned_participants = marks.filter(
    (row) => !row.judges.some((judge) => isActive(judge.status))
  ).length;

  return {
    competition_name: competition.name,
    marks,
    distribution,
    unassigned_participants,
  };
}
