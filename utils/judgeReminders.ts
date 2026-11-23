import "server-only";

import type { Filter, WithId } from "mongodb";

import { getAppOrigin } from "@/lib/appOrigin";
import {
  competitionEmailCopy,
  mailboxForLevels,
  sendJudgeEvaluationReminderEmail,
  type JudgeEvaluationReminderKind,
} from "@/lib/email";
import { CompetitionModel } from "@/models/Competition";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { UserModel } from "@/models/User";
import {
  competitionReminderStampSchema,
  type Competition,
} from "@/schemas/competitionSchema";
import type { EducationLevel } from "@/schemas/educationLevel";
import type { JudgeAssignment } from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";
import type { ScoringAudience } from "@/schemas/scoringAudience";
import {
  scoringAudienceOf,
  withScoringAudience,
} from "@/schemas/scoringAudience";
import type { User } from "@/schemas/userSchema";
import {
  educationLevelForRole,
  scoringRolesForAudience,
  type UserRole,
} from "@/schemas/userRole";
import { findRegistrationsForCompetition } from "@/utils/competitionScope";
import { emailEach } from "@/utils/submissionPayments";
import { usersWithRolesFilter } from "@/utils/roleGrants";

const TIME_ZONE = "Asia/Kuala_Lumpur";

/** Calendar day in Malaysia as YYYY-MM-DD. */
export function kualaLumpurDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addCalendarDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function scheduledReminderKind(
  competition: Pick<
    Competition,
    | "judging_start_date"
    | "judging_due_date"
    | "judge_start_reminder_sent_at"
    | "judge_due_reminder_sent_at"
  >,
  today = kualaLumpurDateKey(new Date())
): "started" | "due-soon" | "both" | null {
  const start = competition.judging_start_date
    ? kualaLumpurDateKey(competition.judging_start_date)
    : null;
  const due = competition.judging_due_date
    ? kualaLumpurDateKey(competition.judging_due_date)
    : null;
  const beforeDue = !due || today < due;
  const startDue =
    Boolean(start) &&
    today >= start! &&
    beforeDue &&
    !competition.judge_start_reminder_sent_at;
  const dueSoon =
    Boolean(due) &&
    today >= addCalendarDays(due!, -3) &&
    today <= due! &&
    !competition.judge_due_reminder_sent_at;

  if (startDue && dueSoon) return "both";
  if (startDue) return "started";
  if (dueSoon) return "due-soon";
  return null;
}

async function assignedJudges(options: {
  competitionId: string;
  track: EducationLevel | null;
  unscoredOnly: boolean;
  audience: ScoringAudience;
}) {
  const registrations = await findRegistrationsForCompetition(
    options.competitionId
  );
  const inTrack = options.track
    ? registrations.filter(
        (registration) =>
          registration.participant.education_level === options.track
      )
    : registrations;
  const numbers = inTrack.map((registration) => registration.registration_number);
  if (numbers.length === 0) {
    return { judges: [] as WithId<User>[], outstanding: new Map<string, number>() };
  }

  const assignments = (
    await new JudgeAssignmentModel().find(
      withScoringAudience(
        {
          registration_number: { $in: numbers },
          status: { $ne: "REJECTED" },
        },
        options.audience
      ) as Filter<JudgeAssignment>
    )
  ).filter(
    (assignment) => scoringAudienceOf(assignment.audience) === options.audience
  );

  const outstanding = new Map<string, number>();
  const involved = new Set<string>();
  for (const assignment of assignments) {
    const judgeId = toIdString(assignment.judge_id);
    involved.add(judgeId);
    if (!assignment.submitted_at) {
      outstanding.set(judgeId, (outstanding.get(judgeId) ?? 0) + 1);
    }
  }

  const judgeRoles: UserRole[] = scoringRolesForAudience(
    options.track,
    options.audience
  );
  const users = await new UserModel().find(
    usersWithRolesFilter(judgeRoles, options.competitionId),
    { sort: { email: 1 } }
  );

  const wanted = options.unscoredOnly ? outstanding : involved;
  const judges = users.filter((user) => wanted.has(toIdString(user._id)));
  return { judges, outstanding };
}

export async function sendJudgeReminders(options: {
  competition: WithId<Competition>;
  kind: JudgeEvaluationReminderKind;
  track: EducationLevel | null;
  audience: ScoringAudience;
}) {
  const competitionId = toIdString(options.competition._id);
  const { judges, outstanding } = await assignedJudges({
    competitionId,
    track: options.track,
    unscoredOnly: options.kind === "unscored",
    audience: options.audience,
  });
  if (judges.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  const origin = await getAppOrigin();
  const assignmentsUrl = `${origin}/portal/my-assignments`;
  const copy = competitionEmailCopy(options.competition);
  const delivery = await emailEach(
    judges.map((judge) => judge.email),
    (to) => {
      const judge = judges.find(
        (item) => item.email.toLowerCase() === to.toLowerCase()
      );
      return sendJudgeEvaluationReminderEmail({
        to,
        name: judge?.name,
        copy,
        educationLevel:
          options.track ??
          mailboxForLevels(
            (judge?.roles ?? []).map((grant) => educationLevelForRole(grant.role))
          ),
        kind: options.kind,
        assignmentsUrl,
        outstandingCount: judge
          ? outstanding.get(toIdString(judge._id))
          : undefined,
      });
    }
  );
  return delivery;
}

export async function stampScheduledReminder(
  competitionId: string,
  kind: "started" | "due-soon" | "both"
) {
  const now = new Date();
  const stamp: {
    judge_start_reminder_sent_at?: Date;
    judge_due_reminder_sent_at?: Date;
  } = {};
  if (kind === "started" || kind === "both") {
    stamp.judge_start_reminder_sent_at = now;
  }
  if (kind === "due-soon" || kind === "both") {
    stamp.judge_due_reminder_sent_at = now;
  }
  await new CompetitionModel().update(
    competitionId,
    stamp,
    competitionReminderStampSchema
  );
}
