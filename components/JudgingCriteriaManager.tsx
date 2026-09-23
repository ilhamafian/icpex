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
import type { JudgeCriteriaType } from "@/schemas/judgeCriteriaSchema";
import type { SerializedJudgeCriteria } from "@/utils/serializeJudgeCriteria";

type FormState = {
  name: string;
  description: string;
  weight: string;
  type: JudgeCriteriaType;
};

function emptyForm(type: JudgeCriteriaType = "THESIS"): FormState {
  return {
    name: "",
    description: "",
    weight: "",
    type,
  };
}

function criteriaToForm(criteria: SerializedJudgeCriteria): FormState {
  return {
    name: criteria.name,
    description: criteria.description,
    weight: String(criteria.weight),
    type: criteria.type,
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

const TYPE_LABELS: Record<JudgeCriteriaType, string> = {
  THESIS: "Thesis",
  EBOOK: "E-Book",
};

export function JudgingCriteriaManager({
  initialCriteria,
}: {
  initialCriteria: SerializedJudgeCriteria[];
}) {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [tab, setTab] = useState<JudgeCriteriaType>("THESIS");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] =
    useState<SerializedJudgeCriteria | null>(null);

  const byType = useMemo(() => {
    const thesis = criteria.filter((item) => item.type === "THESIS");
    const ebook = criteria.filter((item) => item.type === "EBOOK");
    return {
      THESIS: thesis,
      EBOOK: ebook,
      THESIS_WEIGHT: thesis.reduce((sum, item) => sum + item.weight, 0),
      EBOOK_WEIGHT: ebook.reduce((sum, item) => sum + item.weight, 0),
    };
  }, [criteria]);

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

  async function handleSave() {
    const name = form.name.trim();
    const description = form.description.trim();
    const weight = Number(form.weight);

    if (!name) {
      toast.error("Name is required.");
      return;
    }
    if (!description) {
      toast.error("Description is required.");
      return;
    }
    if (!Number.isFinite(weight) || weight < 0) {
      toast.error("Weight must be a number 0 or greater.");
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
            description,
            weight,
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
        if (editingId) {
          return prev.map((item) =>
            item._id === editingId ? data.criteria : item
          );
        }
        return [...prev, data.criteria].sort((a, b) =>
          a.type === b.type
            ? a.name.localeCompare(b.name)
            : a.type.localeCompare(b.type)
        );
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Judging Criteria</h2>
          <p className="text-sm text-muted-foreground">
            Define weighted scoring criteria for thesis and e-book judges.
          </p>
        </div>
        <Button size="icon" onClick={openCreate} aria-label="Add criteria">
          <IconPlus />
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as JudgeCriteriaType)}
        className="gap-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="THESIS">Thesis</TabsTrigger>
          <TabsTrigger value="EBOOK">E-Book</TabsTrigger>
        </TabsList>

        {(
          [
            ["THESIS", "Thesis"],
            ["EBOOK", "E-Book"],
          ] as const
        ).map(([type, label]) => {
          const items = byType[type];
          const weight =
            type === "THESIS" ? byType.THESIS_WEIGHT : byType.EBOOK_WEIGHT;

          return (
          <TabsContent key={type} value={type} className="mt-0">
            <div className="mb-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {items.length}{" "}
                {items.length === 1 ? "criterion" : "criteria"}
              </span>
              <span>Total weight: {weight}</span>
            </div>

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
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="text-base">
                            {item.name}
                          </CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {item.description}
                          </CardDescription>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {item.criteria_id}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge variant="secondary">
                            Weight {item.weight}
                          </Badge>
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
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          );
        })}
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col gap-4 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Edit criteria" : "Add criteria"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 px-4">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, name: e.target.value }))
                }
                placeholder="Originality"
              />
            </Field>
            <Field label="Description">
              <textarea
                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-24 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
                value={form.description}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
                placeholder="How judges should score this criterion"
              />
            </Field>
            <Field label="Weight">
              <Input
                type="number"
                min={0}
                step="any"
                value={form.weight}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    weight: e.target.value,
                  }))
                }
                placeholder="25"
              />
            </Field>
            <Field label="Type">
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
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THESIS">
                    {TYPE_LABELS.THESIS}
                  </SelectItem>
                  <SelectItem value="EBOOK">{TYPE_LABELS.EBOOK}</SelectItem>
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
            <Button onClick={handleSave} disabled={saving}>
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
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
