"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconExternalLink,
  IconFileText,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { educationLevelLabel } from "@/schemas/educationLevel";
import {
  isJudgingClosed,
  judgeScoringDeadlineMessage,
} from "@/utils/competitionDates";
import { assignmentStatusVariant } from "@/components/my-assignments-data-table";
import { readError } from "@/components/MyAssignmentsManager";
import {
  SCORE_BAND_KEYS,
  SCORE_BAND_LABELS,
  type JudgeRubricBands,
} from "@/schemas/judgeRubricSchema";
import type { Registration } from "@/schemas/registrationSchema";
import {
  averageRubricScores,
  weightedRubricScore,
} from "@/utils/rubricScore";
import type { SerializedJudgeRubric } from "@/utils/serializeJudgeRubric";
import type { SerializedJudgeAssignment } from "@/utils/serializeJudgeAssignment";

export type AssessmentRegistration = {
  registration_number: string;
  competition: string;
  category: string;
  created_at?: string;
  participant: {
    name: string;
    email: string;
    education_level: Registration["participant"]["education_level"];
    institution: { name: string; country: string };
  };
  project: Registration["project"];
  team: Registration["team"];
  supervisors: Registration["supervisors"];
  documents: Registration["documents"];
};

type ScoreFormRow = {
  component_id: string;
  rubric_id: string;
  rubric_name: string;
  name: string;
  description: string;
  weight: number;
  bands: JudgeRubricBands;
  score: string;
  comments: string;
};

const DOCUMENT_LABELS: Record<Registration["documents"][number]["type"], string> =
  {
    ABSTRACT: "Abstract",
    FULL_PAPER: "Full paper",
    VIDEO_LINK: "Video link",
    PROJECT_REPORT: "Report",
    PROJECT_PRESENTATION: "Presentation",
    PROJECT_DEMO: "Demo",
    PROJECT_VIDEO: "Video",
    PROJECT_PHOTO: "Photo",
    PROJECT_OTHER: "Other",
  };

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toScoreForm(
  rubrics: SerializedJudgeRubric[],
  assignment: SerializedJudgeAssignment
): ScoreFormRow[] {
  const existing = new Map(
    assignment.scores.map((score) => [score.component_id, score])
  );
  return rubrics.flatMap((rubric) =>
    rubric.components.map((component) => ({
      component_id: component._id,
      rubric_id: rubric._id,
      rubric_name: rubric.name,
      name: component.name,
      description: component.description,
      weight: component.weight,
      bands: component.bands,
      score: existing.has(component._id)
        ? String(existing.get(component._id)!.score)
        : "",
      comments: existing.get(component._id)?.comments ?? "",
    }))
  );
}

function parsedScore(value: string) {
  const score = Number(value);
  if (value.trim() === "" || !Number.isInteger(score) || score < 1 || score > 10) {
    return null;
  }
  return score;
}

function rubricGroups(rows: ScoreFormRow[]) {
  const groups: {
    rubric_id: string;
    rubric_name: string;
    rows: { row: ScoreFormRow; index: number }[];
  }[] = [];
  rows.forEach((row, index) => {
    const last = groups[groups.length - 1];
    if (!last || last.rubric_id !== row.rubric_id) {
      groups.push({
        rubric_id: row.rubric_id,
        rubric_name: row.rubric_name,
        rows: [{ row, index }],
      });
    } else {
      last.rows.push({ row, index });
    }
  });
  return groups;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words">{value}</span>
    </div>
  );
}

function PersonList({
  people,
  empty,
}: {
  people: { name: string; email: string }[];
  empty: string;
}) {
  if (people.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {people.map((person) => (
        <li key={`${person.email}-${person.name}`} className="flex flex-col">
          <span className="text-sm font-medium">{person.name}</span>
          <span className="text-xs text-muted-foreground">{person.email}</span>
        </li>
      ))}
    </ul>
  );
}

function formatAverage(value: number) {
  return String(Math.round(value * 100) / 100);
}

export function AssessmentWorkspace({
  initialAssignment,
  registration,
  rubrics,
  scoringBlocked = null,
  judgingDueDate = null,
}: {
  initialAssignment: SerializedJudgeAssignment;
  registration: AssessmentRegistration;
  rubrics: SerializedJudgeRubric[];
  scoringBlocked?: string | null;
  judgingDueDate?: string | null;
}) {
  const router = useRouter();
  const [assignment, setAssignment] = useState(initialAssignment);
  const [scoreForm, setScoreForm] = useState(() =>
    toScoreForm(rubrics, initialAssignment)
  );
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scoringClosed = isJudgingClosed(judgingDueDate);
  const deadlineMessage = judgeScoringDeadlineMessage(judgingDueDate);

  const groups = rubricGroups(scoreForm);
  const rubricTotals = groups.map((group) => {
    const parts = group.rows.map(({ row }) => {
      const score = parsedScore(row.score);
      if (score === null) return null;
      return { score, weight: row.weight };
    });
    if (parts.some((part) => part === null)) return null;
    return weightedRubricScore(
      parts.filter((part): part is { score: number; weight: number } => part !== null)
    );
  });
  const completed = scoreForm.filter((row) => parsedScore(row.score) !== null).length;
  const average =
    scoreForm.length > 0 && rubricTotals.every((total) => total !== null)
      ? averageRubricScores(rubricTotals as number[])
      : null;

  function updateRow(index: number, patch: Partial<ScoreFormRow>) {
    setScoreForm((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/my-assignments/${assignment._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error(await readError(res));
      return null;
    }
    const data = (await res.json()) as {
      assignment: SerializedJudgeAssignment;
    };
    setAssignment(data.assignment);
    return data.assignment;
  }

  async function handleSubmitScores() {
    if (scoringClosed) {
      toast.error(deadlineMessage);
      return;
    }
    const scores: { component_id: string; score: number; comments: string }[] =
      [];
    for (const row of scoreForm) {
      const score = parsedScore(row.score);
      if (score === null) {
        toast.error("Enter a whole-number score from 1 to 10 for every component.");
        return;
      }
      scores.push({
        component_id: row.component_id,
        score,
        comments: row.comments.trim(),
      });
    }

    setSaving(true);
    try {
      const updated = await patch({ action: "scores", scores });
      if (updated) {
        toast.success("Scores submitted.");
        router.push("/portal/my-assignments");
      }
    } catch {
      toast.error("Failed to submit scores.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearScores() {
    if (scoringClosed) {
      toast.error(deadlineMessage);
      return;
    }
    setConfirmClear(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/my-assignments/${assignment._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const data = (await res.json()) as {
        assignment: SerializedJudgeAssignment | null;
      };
      if (data.assignment) {
        setAssignment(data.assignment);
        setScoreForm(toScoreForm(rubrics, data.assignment));
      }
      toast.success("Scores cleared.");
    } catch {
      toast.error("Failed to clear scores.");
    } finally {
      setSaving(false);
    }
  }

  const { participant, project, team, supervisors, documents } = registration;

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit px-2" asChild>
          <Link href="/portal/my-assignments">
            <IconArrowLeft />
            Back to assignments
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {registration.registration_number} · {registration.competition}
            </p>
            <h2 className="text-xl font-semibold">{project.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{deadlineMessage}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{registration.category}</Badge>
            <Badge variant={assignmentStatusVariant(assignment.status)}>
              {assignment.submitted_at ? "SCORED" : assignment.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(32rem,50%)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Abstract</CardTitle>
              <CardDescription>
                Submitted {formatDate(registration.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {project.abstract}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Open each file to review the full submission.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No documents were uploaded.
                </p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {documents.map((doc, index) => (
                    <li
                      key={doc.file_url}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <IconFileText className="size-5 shrink-0 text-muted-foreground" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">
                            {doc.file_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {DOCUMENT_LABELS[doc.type]}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={
                            doc.type === "VIDEO_LINK"
                              ? doc.file_url
                              : `/api/my-assignments/${assignment._id}/documents?index=${index}`
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IconExternalLink />
                          Open
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Participant</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="Name" value={participant.name} />
              <DetailField label="Email" value={participant.email} />
              <DetailField
                label="Education level"
                value={educationLevelLabel(participant.education_level)}
              />
              <DetailField
                label="Institution"
                value={`${participant.institution.name}, ${participant.institution.country}`}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>Lead: {team.lead.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <PersonList
                  people={[team.lead, ...team.members]}
                  empty="No team members listed."
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Supervisors</CardTitle>
              </CardHeader>
              <CardContent>
                <PersonList
                  people={supervisors}
                  empty="No supervisors listed."
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>Assessment</CardTitle>
            <CardDescription>
              {assignment.status === "ACCEPTED"
                ? scoringClosed
                  ? deadlineMessage
                  : "Score each component from 1 to 10. A rubric score uses its component weights. Your total is the average of the rubric scores."
                : "You rejected this assignment."}
            </CardDescription>
          </CardHeader>

          {assignment.status === "ACCEPTED" ? (
            <>
              <CardContent className="flex max-h-[calc(100vh-18rem)] flex-col gap-5 overflow-y-auto">
                {scoringBlocked ? (
                  <p className="text-sm text-muted-foreground">{scoringBlocked}</p>
                ) : groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ask a judge leader to add judging criteria.
                  </p>
                ) : (
                  groups.map((group, groupIndex) => (
                    <div key={group.rubric_id} className="flex flex-col gap-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-semibold">{group.rubric_name}</p>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {rubricTotals[groupIndex] === null
                            ? "—"
                            : formatAverage(rubricTotals[groupIndex]!)}
                        </span>
                      </div>
                      {group.rows.map(({ row, index }) => (
                        <div
                          key={row.component_id}
                          className="flex flex-col gap-3 border-b pb-5 last:border-0 last:pb-0"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {row.name}
                              <span className="ml-2 font-normal text-muted-foreground">
                                {row.weight}%
                              </span>
                            </p>
                            {row.description ? (
                              <p className="mt-0.5 text-xs whitespace-pre-line text-muted-foreground">
                                {row.description}
                              </p>
                            ) : null}
                          </div>
                          <dl className="flex flex-col gap-1.5">
                            {SCORE_BAND_KEYS.map((key) => (
                              <div
                                key={key}
                                className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2 text-xs"
                              >
                                <dt className="font-medium">
                                  {SCORE_BAND_LABELS[key]}
                                </dt>
                                <dd className="text-muted-foreground">
                                  {row.bands[key] || "—"}
                                </dd>
                              </div>
                            ))}
                          </dl>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`score-${row.component_id}`}>
                              Score (1–10)
                            </Label>
                            <Input
                              id={`score-${row.component_id}`}
                              type="number"
                              min={1}
                              max={10}
                              step={1}
                              value={row.score}
                              disabled={scoringClosed}
                              onChange={(event) =>
                                updateRow(index, { score: event.target.value })
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`comments-${row.component_id}`}>
                              Comments
                            </Label>
                            <textarea
                              id={`comments-${row.component_id}`}
                              value={row.comments}
                              rows={3}
                              disabled={scoringClosed}
                              className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                              onChange={(event) =>
                                updateRow(index, { comments: event.target.value })
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </CardContent>
              {scoreForm.length > 0 ? (
                <>
                  <Separator />
                  <CardFooter className="flex-col items-stretch gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {completed}/{scoreForm.length} components scored
                      </span>
                      <span className="font-medium tabular-nums">
                        Total {average === null ? "—" : formatAverage(average)}{" "}
                        / 10
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {assignment.submitted_at ? (
                        <Button
                          variant="ghost"
                          disabled={saving || scoringClosed}
                          onClick={() => setConfirmClear(true)}
                        >
                          <IconTrash />
                          Clear
                        </Button>
                      ) : null}
                      <Button
                        className="flex-1"
                        disabled={saving || scoringClosed}
                        onClick={() => void handleSubmitScores()}
                      >
                        {saving
                          ? "Saving…"
                          : assignment.submitted_at
                            ? "Update scores"
                            : "Submit scores"}
                      </Button>
                    </div>
                  </CardFooter>
                </>
              ) : null}
            </>
          ) : null}
        </Card>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear scores?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your submitted scores for{" "}
              <span className="font-medium text-foreground">
                {registration.registration_number}
              </span>
              . The assignment stays accepted so you can score it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleClearScores()}
            >
              Clear scores
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
