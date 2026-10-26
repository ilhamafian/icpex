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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasAtMostOneDecimal } from "@/schemas/judgeDeliverableSchema";
import {
  SCORE_BAND_KEYS,
  SCORE_BAND_LABELS,
  emptyScoreBands,
  type JudgeCriteriaType,
  type ScoreBandKey,
} from "@/schemas/judgeCriteriaSchema";
import type { SerializedJudgeCriteria } from "@/utils/serializeJudgeCriteria";
import type { SerializedJudgeDeliverable } from "@/utils/serializeJudgeDeliverable";

type FormState = {
  name: string;
  component: string;
  type: JudgeCriteriaType;
  bands: Record<ScoreBandKey, string>;
};

const textareaClassName =
  "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-lg border bg-transparent px-2.5 py-2 text-base outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

function emptyForm(type: JudgeCriteriaType = "THESIS"): FormState {
  return {
    name: "",
    component: "",
    type,
    bands: emptyScoreBands(),
  };
}

function criteriaToForm(criteria: SerializedJudgeCriteria): FormState {
  return {
    name: criteria.name,
    component: criteria.component,
    type: criteria.type,
    bands: { ...criteria.bands },
  };
}

function compareCriteria(a: SerializedJudgeCriteria, b: SerializedJudgeCriteria) {
  const aTime = a.created_at ?? "";
  const bTime = b.created_at ?? "";
  if (aTime !== bTime) return aTime < bTime ? -1 : 1;
  return a.name.localeCompare(b.name);
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

const TYPE_LABELS: Record<JudgeCriteriaType, string> = {
  THESIS: "Thesis",
  JTEC: "JTEC",
};

const CRITERIA_TYPES: JudgeCriteriaType[] = ["THESIS", "JTEC"];

function weightsFromDeliverables(
  deliverables: SerializedJudgeDeliverable[]
): Record<JudgeCriteriaType, string> {
  return {
    THESIS: weightInput(deliverables, "THESIS"),
    JTEC: weightInput(deliverables, "JTEC"),
  };
}

function weightInput(
  deliverables: SerializedJudgeDeliverable[],
  type: JudgeCriteriaType
) {
  const match = deliverables.find((item) => item.type === type);
  return match ? String(match.weight) : "";
}

function parsedWeights(weights: Record<JudgeCriteriaType, string>) {
  return CRITERIA_TYPES.map((type) => {
    const raw = weights[type].trim();
    if (raw === "") return { type, weight: null as number | null };
    const weight = Number(raw);
    return {
      type,
      weight: Number.isFinite(weight) ? weight : null,
    };
  });
}

export function JudgingCriteriaManager({
  initialCriteria,
  initialDeliverables,
}: {
  initialCriteria: SerializedJudgeCriteria[];
  initialDeliverables: SerializedJudgeDeliverable[];
}) {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [weights, setWeights] = useState(() =>
    weightsFromDeliverables(initialDeliverables)
  );
  const [savingWeights, setSavingWeights] = useState(false);
  const [tab, setTab] = useState<JudgeCriteriaType>("THESIS");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] =
    useState<SerializedJudgeCriteria | null>(null);

  const byType = useMemo(
    () =>
      Object.fromEntries(
        CRITERIA_TYPES.map((type) => [
          type,
          criteria.filter((item) => item.type === type).sort(compareCriteria),
        ])
      ) as Record<JudgeCriteriaType, SerializedJudgeCriteria[]>,
    [criteria]
  );

  const weightValues = parsedWeights(weights);
  const weightTotal = weightValues.every((item) => item.weight !== null)
    ? Math.round(
        weightValues.reduce((sum, item) => sum + (item.weight ?? 0), 0) * 10
      ) / 10
    : null;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(tab));
    setSheetOpen(true);
  }

  function openEdit(item: SerializedJudgeCriteria) {
    setEditingId(item._id);
    setForm(criteriaToForm(item));
    setSheetOpen(true);
  }

  async function handleSaveWeights() {
    if (weightValues.some((item) => item.weight === null)) {
      toast.error("Enter a percentage for Thesis and JTEC.");
      return;
    }
    if (
      weightValues.some(
        (item) =>
          item.weight === null ||
          item.weight < 0 ||
          item.weight > 100 ||
          !hasAtMostOneDecimal(item.weight)
      )
    ) {
      toast.error(
        "Percentages must be between 0 and 100, with at most one decimal place."
      );
      return;
    }
    const tenths = weightValues.reduce(
      (sum, item) => sum + Math.round((item.weight ?? 0) * 10),
      0
    );
    if (tenths !== 1000) {
      toast.error("Thesis and JTEC must add up to 100%.");
      return;
    }

    setSavingWeights(true);
    try {
      const res = await fetch("/api/judge-deliverables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverables: weightValues.map((item) => ({
            type: item.type,
            weight: item.weight,
          })),
        }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const data = (await res.json()) as {
        deliverables: SerializedJudgeDeliverable[];
      };
      setWeights(weightsFromDeliverables(data.deliverables));
      toast.success("Deliverable weights saved.");
    } catch {
      toast.error("Failed to save deliverable weights.");
    } finally {
      setSavingWeights(false);
    }
  }

  async function handleSave() {
    const name = form.name.trim();
    const component = form.component.trim();
    const bands = Object.fromEntries(
      SCORE_BAND_KEYS.map((key) => [key, form.bands[key].trim()])
    ) as Record<ScoreBandKey, string>;

    if (!name) {
      toast.error("Name is required.");
      return;
    }
    if (!component) {
      toast.error("Component is required.");
      return;
    }
    if (SCORE_BAND_KEYS.some((key) => !bands[key])) {
      toast.error("Every score range needs a description.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/judge-criteria/${editingId}` : "/api/judge-criteria",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            component,
            bands,
            type: form.type,
          }),
        }
      );

      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }

      const data = (await res.json()) as { criteria: SerializedJudgeCriteria };
      setCriteria((prev) => {
        const next = editingId
          ? prev.map((item) => (item._id === editingId ? data.criteria : item))
          : [...prev, data.criteria];
        return next.sort(compareCriteria);
      });
      setSheetOpen(false);
      toast.success(editingId ? "Criteria updated." : "Criteria created.");
    } catch {
      toast.error("Failed to save criteria.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/judge-criteria/${target._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      setCriteria((prev) => prev.filter((item) => item._id !== target._id));
      toast.success(`Deleted ${target.name}`);
    } catch {
      toast.error("Failed to delete criteria.");
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold">Judging Criteria</h2>
        <p className="text-sm text-muted-foreground">
          Set how much Thesis and JTEC count, then define the rubric for each
          deliverable.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deliverables</CardTitle>
          <CardDescription>
            Thesis and JTEC percentages must add up to 100%. Criteria inside a
            deliverable count equally.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {CRITERIA_TYPES.map((type) => (
              <Field key={type} label={`${TYPE_LABELS[type]} weight (%)`}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={weights[type]}
                  onChange={(event) =>
                    setWeights((current) => ({
                      ...current,
                      [type]: event.target.value,
                    }))
                  }
                  placeholder="50"
                />
              </Field>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p
              className={
                weightTotal !== null && weightTotal !== 100
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              Total: {weightTotal === null ? "—" : `${weightTotal}%`}
            </p>
            <Button onClick={() => void handleSaveWeights()} disabled={savingWeights}>
              {savingWeights ? "Saving…" : "Save weights"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Rubric</h3>
        <Button size="icon" onClick={openCreate} aria-label="Add criteria">
          <IconPlus />
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as JudgeCriteriaType)}
        className="gap-4"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          {CRITERIA_TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {TYPE_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>

        {CRITERIA_TYPES.map((type) => {
          const items = byType[type];
          const label = TYPE_LABELS[type];

          return (
            <TabsContent key={type} value={type} className="mt-0">
              <p className="mb-3 text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "criterion" : "criteria"}
              </p>

              {items.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No {label.toLowerCase()} criteria yet. Tap + to add one.
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <Card key={item._id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-base">
                              {item.name}
                            </CardTitle>
                            <CardDescription className="mt-1 whitespace-pre-line">
                              {item.component}
                            </CardDescription>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(item)}
                              aria-label={`Edit ${item.name}`}
                            >
                              <IconPencil />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTarget(item)}
                              aria-label={`Delete ${item.name}`}
                            >
                              <IconTrash />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <dl className="flex flex-col gap-2">
                          {SCORE_BAND_KEYS.map((key) => (
                            <div
                              key={key}
                              className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 text-sm"
                            >
                              <dt className="font-medium">
                                {SCORE_BAND_LABELS[key]}
                              </dt>
                              <dd className="text-muted-foreground">
                                {item.bands[key] || "No description yet."}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto data-[side=right]:sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Edit criteria" : "Add criteria"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 px-4">
            <Field label="Criteria">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Originality"
              />
            </Field>
            <Field label="Component">
              <textarea
                className={`${textareaClassName} min-h-24`}
                value={form.component}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    component: event.target.value,
                  }))
                }
                placeholder="What this criterion covers"
              />
            </Field>
            {SCORE_BAND_KEYS.map((key) => (
              <Field key={key} label={`${SCORE_BAND_LABELS[key]} description`}>
                <textarea
                  className={`${textareaClassName} min-h-16`}
                  value={form.bands[key]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bands: { ...current.bands, [key]: event.target.value },
                    }))
                  }
                  placeholder={`How a score of ${SCORE_BAND_LABELS[key]} looks`}
                />
              </Field>
            ))}
            <Field label="Deliverable">
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    type: value as JudgeCriteriaType,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select deliverable" />
                </SelectTrigger>
                <SelectContent>
                  {CRITERIA_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete criteria?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              . Judges will no longer see this scoring item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
