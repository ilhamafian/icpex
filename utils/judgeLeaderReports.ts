import "server-only";

import { ObjectId, type Filter } from "mongodb";

import { CategoryModel } from "@/models/Category";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { JudgeRubricModel } from "@/models/JudgeRubric";
import { UserModel } from "@/models/User";
import type { EducationLevel } from "@/schemas/educationLevel";
import type {
  JudgeAssignmentStatus,
  JudgeScore,
} from "@/schemas/judgeAssignmentsSchema";
import {
  emptyLivePresentationDraft,
  livePresentationDraft,
  type LivePresentationDraft,
} from "@/schemas/competitionSchema";
import { toIdString } from "@/schemas/objectId";
import type { User } from "@/schemas/userSchema";
import type { ScoringAudience } from "@/schemas/scoringAudience";
import {
  scoringAudienceOf,
  withScoringAudience,
} from "@/schemas/scoringAudience";
import {
  educationLevelForRole,
  scoringRolesForAudience,
  type UserRole,
} from "@/schemas/userRole";
import { findRegistrationsForCompetition } from "@/utils/competitionScope";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { usersWithRolesFilter } from "@/utils/roleGrants";
import { serializeJudgeRubric } from "@/utils/serializeJudgeRubric";

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
  status: JudgeAssignmentStatus;
  total_score: number;
  submitted: boolean;
  comments: string;
  scores: ParticipantMarkScore[];
};

export type ParticipantMarkRow = {
  registration_id: string;
  registration_number: string;
  participant_name: string;
  institution_name: string;
  category_name: string;
  project_title: string;
  education_level: EducationLevel;
  judges: ParticipantMarkJudge[];
  average_score: number | null;
  /** True once a judge leader has nominated this participant. */
  nominated: boolean;
  /** True after the live-presentation invitation has been sent. */
  invited: boolean;
  live_presentation_order: number | null;
};

export type JudgeDistributionParticipant = {
  registration_number: string;
  participant_name: string;
  project_title: string;
  category_name: string;
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
  live_presentation: LivePresentationDraft;
};

export function emptyJudgeLeaderReport(): JudgeLeaderReport {
  return {
    competition_name: null,
    marks: [],
    distribution: [],
    unassigned_participants: 0,
    live_presentation: emptyLivePresentationDraft(),
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

function scoreComponentId(score: JudgeScore) {
  return toIdString(score.component_id ?? score.criteria_id);
}

function assignmentComment(
  comments: string | undefined,
  scores: JudgeScore[] | undefined
) {
  if (comments?.trim()) return comments;
  return scores?.find((score) => score.comments?.trim())?.comments ?? "";
}

function scoresForAssignment(
  assignmentScores: JudgeScore[],
  submitted: boolean,
  componentNames: Map<string, string>
): ParticipantMarkScore[] {
  if (!submitted) return [];
  const rows: ParticipantMarkScore[] = [];
  const seen = new Set<string>();
  for (const [id, name] of componentNames) {
    const score = assignmentScores.find((item) => scoreComponentId(item) === id);
    if (!score) continue;
    seen.add(id);
    rows.push({
      criteria_id: id,
      criteria_name: name,
      score: score.score,
      comments: score.comments ?? "",
    });
  }
  for (const score of assignmentScores) {
    const id = scoreComponentId(score);
    if (!id || seen.has(id)) continue;
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
  role: UserRole,
  audience: ScoringAudience = "JUDGE"
): Promise<JudgeLeaderReport> {
  const competition = await getCurrentCompetition();
  if (!competition) return emptyJudgeLeaderReport();

  const competitionId = toIdString(competition._id);
  const track = educationLevelForRole(role);
  const judgeRoles = scoringRolesForAudience(track, audience);

  const assignmentModel = new JudgeAssignmentModel();
  await assignmentModel.collapseDuplicates();

  const [foundRegistrations, assignedJudges, categories, rubricDocs] =
    await Promise.all([
      findRegistrationsForCompetition(competitionId),
      new UserModel().find(usersWithRolesFilter(judgeRoles, competitionId), {
        sort: { name: 1, email: 1 },
      }),
      new CategoryModel().find({}),
      new JudgeRubricModel().find(
        withScoringAudience(
          track
            ? { competition_id: competitionId, education_level: track }
            : { competition_id: competitionId },
          audience
        ) as never,
        { sort: { sort_order: 1, created_at: 1 } }
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
      : (
          await assignmentModel.find(
            withScoringAudience(
              { registration_number: { $in: registrationNumbers } },
              audience
            ) as never
          )
        ).filter(
          (assignment) => scoringAudienceOf(assignment.audience) === audience
        );

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
  const componentNames = new Map<string, string>();
  for (const rubric of rubricDocs
    .filter((rubric) => scoringAudienceOf(rubric.audience) === audience)
    .map(serializeJudgeRubric)) {
    for (const component of rubric.components) {
      componentNames.set(component._id, `${rubric.name} · ${component.name}`);
    }
  }

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
          status: assignment.status,
          total_score: assignment.total_score ?? 0,
          submitted,
          comments: assignmentComment(assignment.comments, assignment.scores),
          scores: scoresForAssignment(
            assignment.scores ?? [],
            submitted,
            componentNames
          ),
        };
      }
    );
    const scored = judges.filter(
      (judge) => judge.submitted && isActive(judge.status)
    );
    return {
      registration_id: toIdString(registration._id),
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
      nominated: Boolean(registration.live_presentation_nominated_at),
      invited: Boolean(registration.live_presentation_invited_at),
      live_presentation_order: registration.live_presentation_order ?? null,
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
      status: assignment.status,
      total_score: assignment.total_score ?? 0,
      submitted: Boolean(assignment.submitted_at),
    });
    if (!isActive(assignment.status)) {
      row.declined_count += 1;
      continue;
    }
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
        a.registration_number.localeCompare(b.registration_number)
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
    live_presentation: livePresentationDraft(competition),
  };
}
