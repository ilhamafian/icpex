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
  assignmentStatusVariant,
  TYPE_LABELS,
} from "@/components/my-assignments-data-table";
import { readError } from "@/components/MyAssignmentsManager";
import type { Registration } from "@/schemas/registrationSchema";
import type { SerializedJudgeCriteria } from "@/utils/serializeJudgeCriteria";
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
  criteria_id: string;
  score: string;
  comments: string;
};

const DOCUMENT_LABELS: Record<Registration["documents"][number]["type"], string> =
  {
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
  criteria: SerializedJudgeCriteria[],
  assignment: SerializedJudgeAssignment
): ScoreFormRow[] {
  const existing = new Map(
    assignment.scores.map((score) => [score.criteria_id, score])
  );
  return criteria.map((item) => ({
    criteria_id: item._id,
    score: existing.has(item._id) ? String(existing.get(item._id)!.score) : "",
    comments: existing.get(item._id)?.comments ?? "",
  }));
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

export function AssessmentWorkspace({
  initialAssignment,
  registration,
  criteria,
}: {
  initialAssignment: SerializedJudgeAssignment;
  registration: AssessmentRegistration;
  criteria: SerializedJudgeCriteria[];
}) {
  const router = useRouter();
  const [assignment, setAssignment] = useState(initialAssignment);
  const [scoreForm, setScoreForm] = useState(() =>
    toScoreForm(criteria, initialAssignment)
  );
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const weightedTotal = scoreForm.reduce((sum, row, index) => {
    const score = Number(row.score);
    if (row.score.trim() === "" || !Number.isFinite(score)) return sum;
    return sum + score * (criteria[index]?.weight ?? 1);
  }, 0);
  const completed = scoreForm.filter((row) => row.score.trim() !== "").length;

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

  async function handleRespond(status: "ACCEPTED" | "REJECTED") {
    setSaving(true);
    try {
      const updated = await patch({ action: "status", status });
      if (updated) {
        toast.success(
          status === "ACCEPTED"
            ? "Assignment accepted. You can now score it."
            : "Assignment rejected."
        );
      }
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitScores() {
    const scores: { criteria_id: string; score: number; comments: string }[] =
      [];
    for (const row of scoreForm) {
      const score = Number(row.score);
      if (row.score.trim() === "" || !Number.isFinite(score)) {
        toast.error("Enter a score for every criterion.");
        return;
      }
      if (score < 0 || score > 100) {
        toast.error("Scores must be between 0 and 100.");
        return;
      }
      scores.push({
        criteria_id: row.criteria_id,
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
        setScoreForm(toScoreForm(criteria, data.assignment));
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
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{TYPE_LABELS[assignment.type]}</Badge>
            <Badge variant="outline">{registration.category}</Badge>
            <Badge variant={assignmentStatusVariant(assignment.status)}>
              {assignment.submitted_at ? "SCORED" : assignment.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
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
                  {documents.map((doc) => (
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
                        <a href={doc.file_url} target="_blank" rel="noreferrer">
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
                ? "Score each criterion from 0 to 100."
                : assignment.status === "PENDING"
                  ? "Read the submission, then accept to start scoring."
                  : "You rejected this assignment."}
            </CardDescription>
          </CardHeader>

          {assignment.status === "PENDING" ? (
            <CardFooter className="gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={saving}
                onClick={() => void handleRespond("REJECTED")}
              >
                Reject
              </Button>
              <Button
                className="flex-1"
                disabled={saving}
                onClick={() => void handleRespond("ACCEPTED")}
              >
                Accept
              </Button>
            </CardFooter>
          ) : null}

          {assignment.status === "ACCEPTED" ? (
            <>
              <CardContent className="flex max-h-[calc(100vh-18rem)] flex-col gap-5 overflow-y-auto">
                {criteria.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No criteria are configured for{" "}
                    {TYPE_LABELS[assignment.type].toLowerCase()} judging yet.
                    Ask an admin to add judging criteria.
                  </p>
                ) : (
                  criteria.map((criterion, index) => {
                    const row = scoreForm[index];
                    return (
                      <div
                        key={criterion._id}
                        className="flex flex-col gap-3 border-b pb-5 last:border-0 last:pb-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              {criterion.name}
                            </p>
                            {criterion.description ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {criterion.description}
                              </p>
                            ) : null}
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            ×{criterion.weight}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`score-${criterion._id}`}>
                            Score (0–100)
                          </Label>
                          <Input
                            id={`score-${criterion._id}`}
                            type="number"
                            min={0}
                            max={100}
                            step="any"
                            value={row.score}
                            onChange={(event) =>
                              updateRow(index, { score: event.target.value })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`comments-${criterion._id}`}>
                            Comments
                          </Label>
                          <textarea
                            id={`comments-${criterion._id}`}
                            value={row.comments}
                            rows={3}
                            className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            onChange={(event) =>
                              updateRow(index, { comments: event.target.value })
                            }
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
              {criteria.length > 0 ? (
                <>
                  <Separator />
                  <CardFooter className="flex-col items-stretch gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {completed}/{criteria.length} criteria scored
                      </span>
                      <span className="font-medium tabular-nums">
                        Weighted total {weightedTotal}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {assignment.submitted_at ? (
                        <Button
                          variant="ghost"
                          disabled={saving}
                          onClick={() => setConfirmClear(true)}
                        >
                          <IconTrash />
                          Clear
                        </Button>
                      ) : null}
                      <Button
                        className="flex-1"
                        disabled={saving}
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
