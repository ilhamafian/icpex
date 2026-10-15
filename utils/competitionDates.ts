const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCompetitionDates(start: string | Date, end: string | Date) {
  return `${dateFormat.format(new Date(start))} – ${dateFormat.format(new Date(end))}`;
}

export function formatJudgingDueDate(due: string | Date) {
  return dateFormat.format(new Date(due));
}

/** Deadline is the end of the UTC calendar day stored on the competition. */
export function judgingDueInstant(due: string | Date): Date {
  const date = new Date(due);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

/** Missing due date leaves scoring open. A set date closes after that UTC day. */
export function isJudgingClosed(
  due: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!due) return false;
  return now.getTime() > judgingDueInstant(due).getTime();
}

export function judgeScoringDeadlineMessage(
  due: string | Date | null | undefined
): string {
  if (!due) return "No scoring deadline is set.";
  const label = formatJudgingDueDate(due);
  if (isJudgingClosed(due)) {
    return `Scoring closed on ${label}. Scores can no longer be submitted or changed.`;
  }
  return `Submit scores by ${label}.`;
}

export function leaderScoringDeadlineMessage(
  due: string | Date | null | undefined
): string {
  if (!due) return "No scoring deadline is set for this competition.";
  const label = formatJudgingDueDate(due);
  if (isJudgingClosed(due)) {
    return `Scoring closed on ${label}.`;
  }
  return `Judges must submit scores by ${label}.`;
}
