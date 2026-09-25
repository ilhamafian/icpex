"use client";

import { useMemo, useState } from "react";
import { IconPencil, IconTrash } from "@tabler/icons-react";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  JudgeAssignmentStatus,
  JudgeAssignmentType,
} from "@/schemas/judgeAssignmentsSchema";
import type { AssignmentRegistrationOption } from "@/utils/assignmentOptions";
import type { SerializedJudgeCriteria } from "@/utils/serializeJudgeCriteria";
import type { SerializedJudgeAssignment } from "@/utils/serializeJudgeAssignment";

type ScoreFormRow = {
  criteria_id: string;
  score: string;
  comments: string;
};

function statusVariant(
  status: JudgeAssignmentStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ACCEPTED":
      return "default";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string") return data.error;
    return "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}

export function MyAssignmentsManager({
  initialAssignments,
  registrations,
  criteria,
  allowedTypes,
}: {
  initialAssignments: SerializedJudgeAssignment[];
  registrations: AssignmentRegistrationOption[];
  criteria: SerializedJudgeCriteria[];
  allowedTypes: JudgeAssignmentType[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [tab, setTab] = useState<JudgeAssignmentType>(
    allowedTypes[0] ?? "THESIS"
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] =
    useState<SerializedJudgeAssignment | null>(null);
  const [scoreForm, setScoreForm] = useState<ScoreFormRow[]>([]);
  const [clearTarget, setClearTarget] =
    useState<SerializedJudgeAssignment | null>(null);

  const registrationsByNumber = useMemo(() => {
    const map = new Map<string, AssignmentRegistrationOption>();
    for (const registration of registrations) {
      map.set(registration.registration_number, registration);
    }
    return map;
  }, [registrations]);

  const criteriaByType = useMemo(() => {
    return {
      THESIS: criteria.filter((item) => item.type === "THESIS"),
      EBOOK: criteria.filter((item) => item.type === "EBOOK"),
    };
  }, [criteria]);

  const byType = useMemo(() => {
    return {
      THESIS: assignments.filter((item) => item.type === "THESIS"),
      EBOOK: assignments.filter((item) => item.type === "EBOOK"),
    };
  }, [assignments]);

  function openScore(assignment: SerializedJudgeAssignment) {
    const typeCriteria = criteriaByType[assignment.type];
    const existingByCriteria = new Map(
      assignment.scores.map((score) => [score.criteria_id, score])
    );

    setScoring(assignment);
    setScoreForm(
      typeCriteria.map((item) => {
        const existing = existingByCriteria.get(item._id);
        return {
          criteria_id: item._id,
          score: existing ? String(existing.score) : "",
          comments: existing?.comments ?? "",
        };
      })
    );
    setSheetOpen(true);
  }

  async function patchAssignment(
    id: string,
    body: Record<string, unknown>
  ): Promise<SerializedJudgeAssignment | null> {
    const res = await fetch(`/api/my-assignments/${id}`, {
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
    setAssignments((prev) =>
      prev.map((item) => (item._id === id ? data.assignment : item))
    );
    return data.assignment;
  }

  async function handleStatus(
    assignment: SerializedJudgeAssignment,
    status: "ACCEPTED" | "REJECTED"
  ) {
    setSaving(true);
    try {
      const updated = await patchAssignment(assignment._id, {
        action: "status",
        status,
      });
      if (updated) {
        toast.success(
          status === "ACCEPTED" ? "Assignment accepted." : "Assignment rejected."
        );
      }
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveScores() {
    if (!scoring) return;

    if (scoreForm.length === 0) {
      toast.error("No judging criteria configured for this type.");
      return;
    }

    const scores: { criteria_id: string; score: number; comments: string }[] =
      [];
    for (const row of scoreForm) {
      const score = Number(row.score);
      if (!Number.isFinite(score) || row.score.trim() === "") {
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
      const updated = await patchAssignment(scoring._id, {
        action: "scores",
        scores,
      });
      if (updated) {
        setSheetOpen(false);
        setScoring(null);
        toast.success("Scores submitted.");
      }
    } catch {
      toast.error("Failed to submit scores.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmClearScores() {
    if (!clearTarget) return;
    const target = clearTarget;
    setClearTarget(null);

    try {
      const res = await fetch(`/api/my-assignments/${target._id}`, {
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
        setAssignments((prev) =>
          prev.map((item) =>
            item._id === target._id ? data.assignment! : item
          )
        );
      }
      toast.success("Scores cleared.");
    } catch {
      toast.error("Failed to clear scores.");
    }
  }

  const typeLabels: Record<JudgeAssignmentType, string> = {
    THESIS: "Thesis",
    EBOOK: "E-Book",
  };

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold">My Assignments</h2>
        <p className="text-sm text-muted-foreground">
          Review assigned participants, accept or reject, and submit scores.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as JudgeAssignmentType)}
        className="gap-4"
      >
        <TabsList
          className={`grid w-full ${
            allowedTypes.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {allowedTypes.map((type) => (
            <TabsTrigger key={type} value={type}>
              {typeLabels[type]}
            </TabsTrigger>
          ))}
        </TabsList>

        {allowedTypes.map((type) => {
          const items = byType[type];
          const label = typeLabels[type];
          return (
            <TabsContent key={type} value={type} className="mt-0">
              <div className="mb-3 text-sm text-muted-foreground">
                {items.length}{" "}
                {items.length === 1 ? "assignment" : "assignments"}
              </div>

              {items.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No {label.toLowerCase()} assignments yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {items.map((item) => {
                    const registration = registrationsByNumber.get(
                      item.registration_number
                    );
                    return (
                      <Card key={item._id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <CardTitle className="text-base">
                                {item.registration_number}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {registration?.project_title ??
                                  "Unknown project"}
                                {registration
                                  ? ` · ${registration.participant_name}`
                                  : ""}
                              </CardDescription>
                              {item.submitted_at ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Total {item.total_score} · submitted{" "}
                                  {new Date(
                                    item.submitted_at
                                  ).toLocaleDateString()}
                                </p>
                              ) : item.status === "ACCEPTED" ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Accepted — scores not submitted yet
                                </p>
                              ) : null}
                            </div>
                            <Badge variant={statusVariant(item.status)}>
                              {item.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2 pt-0">
                          {item.status === "PENDING" ? (
                            <>
                              <Button
                                size="sm"
                                disabled={saving}
                                onClick={() =>
                                  void handleStatus(item, "ACCEPTED")
                                }
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() =>
                                  void handleStatus(item, "REJECTED")
                                }
                              >
                                Reject
                              </Button>
                            </>
                          ) : null}

                          {item.status === "ACCEPTED" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openScore(item)}
                              >
                                <IconPencil />
                                {item.submitted_at
                                  ? "Edit scores"
                                  : "Submit scores"}
                              </Button>
                              {item.scores.length > 0 || item.submitted_at ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setClearTarget(item)}
                                  aria-label={`Clear scores for ${item.registration_number}`}
                                >
                                  <IconTrash />
                                  Clear scores
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setScoring(null);
        }}
      >
        <SheetContent className="flex flex-col gap-4 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {scoring?.submitted_at ? "Edit scores" : "Submit scores"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 px-4">
            {scoring ? (
              <p className="text-sm text-muted-foreground">
                {scoring.registration_number}
                {registrationsByNumber.get(scoring.registration_number)
                  ? ` — ${
                      registrationsByNumber.get(scoring.registration_number)
                        ?.project_title
                    }`
                  : ""}
              </p>
            ) : null}

            {scoreForm.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No criteria configured for this type. Ask an admin to add
                judging criteria.
              </p>
            ) : (
              scoreForm.map((row, index) => {
                const criterion = criteria.find(
                  (item) => item._id === row.criteria_id
                );
                return (
                  <div
                    key={row.criteria_id}
                    className="flex flex-col gap-3 border-b border-border pb-4 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {criterion?.name ?? "Criterion"}
                      </p>
                      {criterion?.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {criterion.description}
                          {criterion.weight
                            ? ` · weight ${criterion.weight}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <Field label="Score (0–100)">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={row.score}
                        onChange={(event) => {
                          const value = event.target.value;
                          setScoreForm((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, score: value } : item
                            )
                          );
                        }}
                      />
                    </Field>
                    <Field label="Comments">
                      <textarea
                        value={row.comments}
                        rows={2}
                        className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        onChange={(event) => {
                          const value = event.target.value;
                          setScoreForm((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, comments: value }
                                : item
                            )
                          );
                        }}
                      />
                    </Field>
                  </div>
                );
              })
            )}
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveScores()}
              disabled={saving || scoreForm.length === 0}
            >
              {saving ? "Saving…" : "Save scores"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={clearTarget !== null}
        onOpenChange={(open) => {
          if (!open) setClearTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear scores?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your submitted scores for{" "}
              <span className="font-medium text-foreground">
                {clearTarget?.registration_number}
              </span>
              . The assignment stays accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmClearScores()}
            >
              Clear scores
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
