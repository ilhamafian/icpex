"use client";

import { useMemo, useState } from "react";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
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
import { ScoringAudienceSwitch } from "@/components/ScoringAudienceSwitch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EDUCATION_LEVEL_LABELS,
  type EducationLevel,
} from "@/schemas/educationLevel";
import {
  SCORE_BAND_KEYS,
  SCORE_BAND_LABELS,
  emptyScoreBands,
  hasAtMostOneDecimal,
  type ScoreBandKey,
} from "@/schemas/judgeRubricSchema";
import {
  scoringAudienceOf,
  type ScoringAudience,
} from "@/schemas/scoringAudience";
import { weightPercent, weightsSumTo100 } from "@/utils/rubricScore";
import type { SerializedJudgeRubric } from "@/utils/serializeJudgeRubric";

type ComponentForm = {
  name: string;
  description: string;
  weight: string;
  bands: Record<ScoreBandKey, string>;
};

const textareaClassName =
  "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-lg border bg-transparent px-2.5 py-2 text-base outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

const TRACKS: EducationLevel[] = ["UNDERGRADUATE", "POSTGRADUATE"];

function emptyComponentForm(): ComponentForm {
  return {
    name: "",
    description: "",
    weight: "",
    bands: emptyScoreBands(),
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
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

function compareRubrics(a: SerializedJudgeRubric, b: SerializedJudgeRubric) {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.name.localeCompare(b.name);
}

export function JudgingCriteriaManager({
  initialRubrics,
  lockedTrack,
}: {
  initialRubrics: SerializedJudgeRubric[];
  lockedTrack: EducationLevel | null;
}) {
  const [rubrics, setRubrics] = useState(initialRubrics);
  const [track, setTrack] = useState<EducationLevel>(
    lockedTrack ?? "UNDERGRADUATE"
  );
  const [audience, setAudience] = useState<ScoringAudience>("JUDGE");
  const [saving, setSaving] = useState(false);
  const [rubricSheet, setRubricSheet] = useState<{
    id: string | null;
    name: string;
  } | null>(null);
  const [componentSheet, setComponentSheet] = useState<{
    rubricId: string;
    componentId: string | null;
    form: ComponentForm;
  } | null>(null);
  const [deleteRubric, setDeleteRubric] = useState<SerializedJudgeRubric | null>(
    null
  );
  const [deleteComponent, setDeleteComponent] = useState<{
    rubric: SerializedJudgeRubric;
    componentId: string;
    name: string;
  } | null>(null);

  const activeTrack = lockedTrack ?? track;
  const visible = useMemo(
    () =>
      rubrics
        .filter(
          (rubric) =>
            rubric.education_level === activeTrack &&
            scoringAudienceOf(rubric.audience) === audience
        )
        .sort(compareRubrics),
    [rubrics, activeTrack, audience]
  );

  function replaceRubric(next: SerializedJudgeRubric) {
    setRubrics((current) => {
      const without = current.filter((rubric) => rubric._id !== next._id);
      return [...without, next];
    });
  }

  async function saveRubricName() {
    if (!rubricSheet) return;
    const name = rubricSheet.name.trim();
    if (!name) {
      toast.error("Enter a rubric name.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        rubricSheet.id ? `/api/judge-rubrics/${rubricSheet.id}` : "/api/judge-rubrics",
        {
          method: rubricSheet.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            rubricSheet.id
              ? { name }
              : { name, education_level: activeTrack, audience }
          ),
        }
      );
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const data = (await res.json()) as { rubric: SerializedJudgeRubric };
      replaceRubric(data.rubric);
      setRubricSheet(null);
      toast.success(rubricSheet.id ? "Rubric renamed." : "Rubric created.");
    } catch {
      toast.error("Failed to save rubric.");
    } finally {
      setSaving(false);
    }
  }

  async function saveComponent() {
    if (!componentSheet) return;
    const rubric = rubrics.find((item) => item._id === componentSheet.rubricId);
    if (!rubric) return;
    const name = componentSheet.form.name.trim();
    const description = componentSheet.form.description.trim();
    const weight = Number(componentSheet.form.weight);
    const bands = Object.fromEntries(
      SCORE_BAND_KEYS.map((key) => [key, componentSheet.form.bands[key].trim()])
    ) as ComponentForm["bands"];

    if (!name) {
      toast.error("Enter a component title.");
      return;
    }
    if (!description) {
      toast.error("Enter a description.");
      return;
    }
    if (
      !Number.isFinite(weight) ||
      weight <= 0 ||
      weight > 100 ||
      !hasAtMostOneDecimal(weight)
    ) {
      toast.error("Enter a weight from 0.1 to 100, with at most one decimal.");
      return;
    }
    if (SCORE_BAND_KEYS.some((key) => !bands[key])) {
      toast.error("Describe every score band.");
      return;
    }

    const components = rubric.components.map((component) => ({
      _id: component._id,
      name: component.name,
      description: component.description,
      weight: component.weight,
      bands: component.bands,
    }));
    const next = {
      name,
      description,
      weight,
      bands,
      ...(componentSheet.componentId ? { _id: componentSheet.componentId } : {}),
    };
    const payload = componentSheet.componentId
      ? components.map((component) =>
          component._id === componentSheet.componentId ? next : component
        )
      : [...components, next];

    setSaving(true);
    try {
      const res = await fetch(`/api/judge-rubrics/${rubric._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ components: payload }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const data = (await res.json()) as { rubric: SerializedJudgeRubric };
      replaceRubric(data.rubric);
      setComponentSheet(null);
      toast.success(componentSheet.componentId ? "Component updated." : "Component added.");
    } catch {
      toast.error("Failed to save component.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteRubric() {
    if (!deleteRubric) return;
    const target = deleteRubric;
    setDeleteRubric(null);
    try {
      const res = await fetch(`/api/judge-rubrics/${target._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      setRubrics((current) => current.filter((rubric) => rubric._id !== target._id));
      toast.success(`Deleted ${target.name}`);
    } catch {
      toast.error("Failed to delete rubric.");
    }
  }

  async function confirmDeleteComponent() {
    if (!deleteComponent) return;
    const target = deleteComponent;
    setDeleteComponent(null);
    const components = target.rubric.components
      .filter((component) => component._id !== target.componentId)
      .map((component) => ({
        _id: component._id,
        name: component.name,
        description: component.description,
        weight: component.weight,
        bands: component.bands,
      }));
    try {
      const res = await fetch(`/api/judge-rubrics/${target.rubric._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ components }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const data = (await res.json()) as { rubric: SerializedJudgeRubric };
      replaceRubric(data.rubric);
      toast.success(`Deleted ${target.name}`);
    } catch {
      toast.error("Failed to delete component.");
    }
  }

  const editingRubric = componentSheet
    ? rubrics.find((rubric) => rubric._id === componentSheet.rubricId)
    : undefined;

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Judging Criteria</h2>
          <p className="text-sm text-muted-foreground">
            {audience === "PAPER_REVIEWER"
              ? "Define the paper-reviewer rubrics for this education track. Component weights inside a rubric add up to 100%. Paper reviewers score every rubric in this set, and the total is the average of those rubric scores."
              : "Define the rubrics for this education track. Component weights inside a rubric add up to 100%. Judges score every rubric, and the total is the average of those rubric scores."}
          </p>
        </div>
        <Button
          onClick={() => setRubricSheet({ id: null, name: "" })}
        >
          <IconPlus />
          Add rubric
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ScoringAudienceSwitch value={audience} onValueChange={setAudience} />
        {lockedTrack ? null : (
          <Tabs
            value={track}
            onValueChange={(value) => setTrack(value as EducationLevel)}
          >
            <TabsList>
              {TRACKS.map((level) => (
                <TabsTrigger key={level} value={level}>
                  {EDUCATION_LEVEL_LABELS[level]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No rubrics yet. Add one to start the scoring form.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((rubric) => {
            const weights = rubric.components.map((component) => component.weight);
            const total = weightPercent(weights);
            const ready = weightsSumTo100(weights);
            return (
              <Card key={rubric._id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{rubric.name}</CardTitle>
                      <CardDescription
                        className={
                          rubric.components.length > 0 && !ready
                            ? "text-destructive"
                            : undefined
                        }
                      >
                        {rubric.components.length === 0
                          ? "No components yet. This rubric is not scored."
                          : ready
                            ? "Weights add up to 100%."
                            : audience === "PAPER_REVIEWER"
                              ? `Weights add up to ${total}%. They must add up to 100% before paper reviewers can score.`
                              : `Weights add up to ${total}%. They must add up to 100% before judges can score.`}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setRubricSheet({ id: rubric._id, name: rubric.name })
                        }
                        aria-label={`Rename ${rubric.name}`}
                      >
                        <IconPencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteRubric(rubric)}
                        aria-label={`Delete ${rubric.name}`}
                      >
                        <IconTrash />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          setComponentSheet({
                            rubricId: rubric._id,
                            componentId: null,
                            form: emptyComponentForm(),
                          })
                        }
                        aria-label={`Add component to ${rubric.name}`}
                      >
                        <IconPlus />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {rubric.components.length > 0 ? (
                  <CardContent className="flex flex-col gap-3">
                    {rubric.components.map((component) => (
                      <div
                        key={component._id}
                        className="rounded-lg border p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {component.name}
                              <span className="ml-2 font-normal text-muted-foreground">
                                {component.weight}%
                              </span>
                            </p>
                            <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                              {component.description}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setComponentSheet({
                                  rubricId: rubric._id,
                                  componentId: component._id,
                                  form: {
                                    name: component.name,
                                    description: component.description,
                                    weight: String(component.weight),
                                    bands: { ...component.bands },
                                  },
                                })
                              }
                              aria-label={`Edit ${component.name}`}
                            >
                              <IconPencil />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setDeleteComponent({
                                  rubric,
                                  componentId: component._id,
                                  name: component.name,
                                })
                              }
                              aria-label={`Delete ${component.name}`}
                            >
                              <IconTrash />
                            </Button>
                          </div>
                        </div>
                        <dl className="mt-3 flex flex-col gap-2">
                          {SCORE_BAND_KEYS.map((key) => (
                            <div
                              key={key}
                              className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 text-sm"
                            >
                              <dt className="font-medium">
                                {SCORE_BAND_LABELS[key]}
                              </dt>
                              <dd className="text-muted-foreground">
                                {component.bands[key]}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Sheet
        open={rubricSheet !== null}
        onOpenChange={(open) => {
          if (!open) setRubricSheet(null);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto data-[side=right]:sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {rubricSheet?.id ? "Rename rubric" : "Add rubric"}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 px-4">
            <Field label="Name">
              <Input
                value={rubricSheet?.name ?? ""}
                onChange={(event) =>
                  setRubricSheet((current) =>
                    current ? { ...current, name: event.target.value } : current
                  )
                }
                placeholder="Presentation"
              />
            </Field>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setRubricSheet(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void saveRubricName()} disabled={saving}>
              {saving ? "Saving…" : rubricSheet?.id ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={componentSheet !== null}
        onOpenChange={(open) => {
          if (!open) setComponentSheet(null);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto data-[side=right]:sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {componentSheet?.componentId ? "Edit component" : "Add component"}
            </SheetTitle>
          </SheetHeader>
          {componentSheet ? (
            <div className="flex flex-1 flex-col gap-4 px-4">
              <Field label="Title">
                <Input
                  value={componentSheet.form.name}
                  onChange={(event) =>
                    setComponentSheet((current) =>
                      current
                        ? {
                            ...current,
                            form: { ...current.form, name: event.target.value },
                          }
                        : current
                    )
                  }
                  placeholder="Originality"
                />
              </Field>
              <Field label="Description">
                <textarea
                  className={`${textareaClassName} min-h-24`}
                  value={componentSheet.form.description}
                  onChange={(event) =>
                    setComponentSheet((current) =>
                      current
                        ? {
                            ...current,
                            form: {
                              ...current.form,
                              description: event.target.value,
                            },
                          }
                        : current
                    )
                  }
                  placeholder="What this component covers"
                />
              </Field>
              <Field label="Weight (%)">
                <Input
                  type="number"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={componentSheet.form.weight}
                  onChange={(event) =>
                    setComponentSheet((current) =>
                      current
                        ? {
                            ...current,
                            form: {
                              ...current.form,
                              weight: event.target.value,
                            },
                          }
                        : current
                    )
                  }
                  placeholder="25"
                />
              </Field>
              {editingRubric ? (
                <ComponentWeightHint
                  rubric={editingRubric}
                  componentId={componentSheet.componentId}
                  weight={componentSheet.form.weight}
                />
              ) : null}
              {SCORE_BAND_KEYS.map((key) => (
                <Field key={key} label={`${SCORE_BAND_LABELS[key]} description`}>
                  <textarea
                    className={`${textareaClassName} min-h-16`}
                    value={componentSheet.form.bands[key]}
                    onChange={(event) =>
                      setComponentSheet((current) =>
                        current
                          ? {
                              ...current,
                              form: {
                                ...current.form,
                                bands: {
                                  ...current.form.bands,
                                  [key]: event.target.value,
                                },
                              },
                            }
                          : current
                      )
                    }
                    placeholder={`How a score of ${SCORE_BAND_LABELS[key]} looks`}
                  />
                </Field>
              ))}
            </div>
          ) : null}
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setComponentSheet(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void saveComponent()} disabled={saving}>
              {saving
                ? "Saving…"
                : componentSheet?.componentId
                  ? "Save changes"
                  : "Add"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteRubric !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteRubric(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rubric?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteRubric?.name}
              </span>{" "}
              and its components. Rubrics that already have submitted scores
              cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteRubric()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteComponent !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteComponent(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete component?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteComponent?.name}
              </span>
              . Components that already have submitted scores cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteComponent()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ComponentWeightHint({
  rubric,
  componentId,
  weight,
}: {
  rubric: SerializedJudgeRubric;
  componentId: string | null;
  weight: string;
}) {
  const parsed = Number(weight);
  const others = rubric.components
    .filter((component) => component._id !== componentId)
    .map((component) => component.weight);
  const total =
    Number.isFinite(parsed) && parsed > 0
      ? weightPercent([...others, parsed])
      : weightPercent(others);
  return <p className="text-sm text-muted-foreground">This rubric would total {total}%.</p>;
}
