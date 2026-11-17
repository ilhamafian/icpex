"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";

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
import {
  CLOSING_CEREMONY_MODE_LABELS,
  closingCeremonyModeSchema,
  type ClosingCeremonyMode,
  type CompetitionStatus,
} from "@/schemas/competitionSchema";
import {
  COMPETITION_ELIGIBILITY_LABELS,
  competitionEligibilitySchema,
  type CompetitionEligibility,
} from "@/schemas/educationLevel";
import type {
  SerializedCategory,
  SerializedCompetition,
} from "@/utils/serializeCatalog";

type Tab = "competitions" | "categories";

type CompetitionFormState = {
  name: string;
  formal_name: string;
  theme: string;
  start_date: string;
  end_date: string;
  payment_deadline: string;
  judging_start_date: string;
  judging_due_date: string;
  closing_ceremony_date: string;
  closing_ceremony_mode: ClosingCeremonyMode;
  closing_ceremony_time: string;
  status: CompetitionStatus;
  eligibility: CompetitionEligibility;
};

type CategoryFormState = {
  name: string;
};

type DeleteTarget = {
  type: "competition" | "category";
  id: string;
  name: string;
};

function toDateInputValue(iso: string) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function emptyCompetitionForm(): CompetitionFormState {
  return {
    name: "",
    formal_name: "",
    theme: "",
    start_date: "",
    end_date: "",
    payment_deadline: "",
    judging_start_date: "",
    judging_due_date: "",
    closing_ceremony_date: "",
    closing_ceremony_mode: "ONLINE",
    closing_ceremony_time: "",
    status: "DRAFT",
    eligibility: "BOTH",
  };
}

function competitionToForm(
  competition: SerializedCompetition
): CompetitionFormState {
  return {
    name: competition.name,
    formal_name: competition.formal_name ?? "",
    theme: competition.theme ?? "",
    start_date: toDateInputValue(competition.start_date),
    end_date: toDateInputValue(competition.end_date),
    payment_deadline: toDateInputValue(competition.payment_deadline ?? ""),
    judging_start_date: toDateInputValue(competition.judging_start_date ?? ""),
    judging_due_date: toDateInputValue(competition.judging_due_date ?? ""),
    closing_ceremony_date: toDateInputValue(
      competition.closing_ceremony_date ?? ""
    ),
    closing_ceremony_mode: competition.closing_ceremony_mode ?? "ONLINE",
    closing_ceremony_time: competition.closing_ceremony_time ?? "",
    status: competition.status,
    eligibility: competition.eligibility,
  };
}

function emptyCategoryForm(): CategoryFormState {
  return { name: "" };
}

function categoryToForm(category: SerializedCategory): CategoryFormState {
  return { name: category.name };
}

function statusVariant(
  status: CompetitionStatus
): "default" | "secondary" | "outline" {
  switch (status) {
    case "PUBLISHED":
      return "default";
    case "COMPLETED":
      return "secondary";
    default:
      return "outline";
  }
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

function formatDateRange(start: string, end: string) {
  const startLabel = new Date(start).toLocaleDateString();
  const endLabel = new Date(end).toLocaleDateString();
  return `${startLabel} – ${endLabel}`;
}

export function CompetitionsCategoriesManager({
  initialCompetitions,
  currentCompetitionId,
  initialCategories,
}: {
  initialCompetitions: SerializedCompetition[];
  /** Published competition that staff roles currently apply to. */
  currentCompetitionId: string | null;
  initialCategories: SerializedCategory[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("competitions");
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [categories, setCategories] = useState(initialCategories);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCompetitionId, setEditingCompetitionId] = useState<
    string | null
  >(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [competitionForm, setCompetitionForm] = useState(emptyCompetitionForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  function openCreateCompetition() {
    setEditingCompetitionId(null);
    setEditingCategoryId(null);
    setCompetitionForm(emptyCompetitionForm());
    setError(null);
    setSheetOpen(true);
  }

  function openEditCompetition(competition: SerializedCompetition) {
    setEditingCompetitionId(competition._id);
    setEditingCategoryId(null);
    setCompetitionForm(competitionToForm(competition));
    setError(null);
    setSheetOpen(true);
  }

  function openCreateCategory() {
    setEditingCategoryId(null);
    setEditingCompetitionId(null);
    setCategoryForm(emptyCategoryForm());
    setError(null);
    setSheetOpen(true);
  }

  function openEditCategory(category: SerializedCategory) {
    setEditingCategoryId(category._id);
    setEditingCompetitionId(null);
    setCategoryForm(categoryToForm(category));
    setError(null);
    setSheetOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const endpoint =
      deleteTarget.type === "competition"
        ? `/api/competitions/${deleteTarget.id}`
        : `/api/categories/${deleteTarget.id}`;

    const response = await fetch(endpoint, { method: "DELETE" });
    if (!response.ok) {
      setError(`Failed to delete ${deleteTarget.type}.`);
      setDeleteTarget(null);
      return;
    }

    if (deleteTarget.type === "competition") {
      setCompetitions((current) =>
        current.filter((item) => item._id !== deleteTarget.id)
      );
    } else {
      setCategories((current) =>
        current.filter((item) => item._id !== deleteTarget.id)
      );
    }

    setDeleteTarget(null);
  }

  async function handleSaveCompetition() {
    if (!competitionForm.name.trim()) {
      setError("Competition name is required.");
      return;
    }
    if (!competitionForm.formal_name.trim()) {
      setError("Formal name is required for emails.");
      return;
    }
    if (!competitionForm.theme.trim()) {
      setError("Theme is required for emails.");
      return;
    }
    if (!competitionForm.start_date || !competitionForm.end_date) {
      setError("Start and end dates are required.");
      return;
    }
    if (!competitionForm.payment_deadline) {
      setError("Payment deadline is required.");
      return;
    }
    if (!competitionForm.judging_start_date) {
      setError("Judging start date is required.");
      return;
    }
    if (!competitionForm.judging_due_date) {
      setError("Scoring due date is required.");
      return;
    }
    if (!competitionForm.closing_ceremony_date) {
      setError("Closing ceremony date is required.");
      return;
    }

    const payload = {
      name: competitionForm.name.trim(),
      formal_name: competitionForm.formal_name.trim(),
      theme: competitionForm.theme.trim(),
      start_date: competitionForm.start_date,
      end_date: competitionForm.end_date,
      payment_deadline: competitionForm.payment_deadline,
      judging_start_date: competitionForm.judging_start_date,
      judging_due_date: competitionForm.judging_due_date,
      closing_ceremony_date: competitionForm.closing_ceremony_date,
      closing_ceremony_mode: competitionForm.closing_ceremony_mode,
      closing_ceremony_time: competitionForm.closing_ceremony_time || null,
      status: competitionForm.status,
      eligibility: competitionForm.eligibility,
    };

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingCompetitionId
          ? `/api/competitions/${editingCompetitionId}`
          : "/api/competitions",
        {
          method: editingCompetitionId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not save competition."
        );
        return;
      }

      const saved = data.competition as SerializedCompetition;
      setCompetitions((current) => {
        if (editingCompetitionId) {
          return current.map((item) =>
            item._id === saved._id ? saved : item
          );
        }
        return [saved, ...current];
      });
      setSheetOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCategory() {
    if (!categoryForm.name.trim()) {
      setError("Category name is required.");
      return;
    }

    const payload = {
      name: categoryForm.name.trim(),
    };

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingCategoryId
          ? `/api/categories/${editingCategoryId}`
          : "/api/categories",
        {
          method: editingCategoryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not save category."
        );
        return;
      }

      const saved = data.category as SerializedCategory;
      setCategories((current) => {
        if (editingCategoryId) {
          return current.map((item) =>
            item._id === saved._id ? saved : item
          );
        }
        return [...current, saved].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });
      setSheetOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const isCompetitionSheet =
    editingCompetitionId !== null ||
    (sheetOpen && editingCategoryId === null && tab === "competitions");
  const isCategorySheet =
    editingCategoryId !== null ||
    (sheetOpen && editingCompetitionId === null && tab === "categories");

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Competitions & Categories</h2>
          <p className="text-sm text-muted-foreground">
            Manage competitions and registration categories used on the public
            form. The published competition with the latest start date is
            current — publishing a newer one resets secretary and judge roles.
          </p>
        </div>
        <Button
          size="icon"
          onClick={
            tab === "competitions" ? openCreateCompetition : openCreateCategory
          }
          aria-label={
            tab === "competitions" ? "Add competition" : "Add category"
          }
        >
          <IconPlus />
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="gap-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="competitions">Competitions</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {error && !sheetOpen ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <TabsContent value="competitions" className="mt-0">
          {competitions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No competitions yet. Tap + to add your first competition.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {competitions.map((competition) => (
                <Card key={competition._id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          {competition.name}
                        </CardTitle>
                        <CardDescription>
                          {competition.competition_id} ·{" "}
                          {formatDateRange(
                            competition.start_date,
                            competition.end_date
                          )}
                        </CardDescription>
                        <CardDescription>
                          {
                            COMPETITION_ELIGIBILITY_LABELS[
                              competition.eligibility
                            ]
                          }
                        </CardDescription>
                        <CardDescription>
                          {competition.judging_due_date
                            ? `Scores due ${new Date(competition.judging_due_date).toLocaleDateString()}`
                            : "No scoring due date"}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {competition._id === currentCompetitionId ? (
                          <Badge variant="secondary">Current</Badge>
                        ) : null}
                        <Badge variant={statusVariant(competition.status)}>
                          {competition.status}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditCompetition(competition)}
                          aria-label={`Edit ${competition.name}`}
                        >
                          <IconPencil />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setDeleteTarget({
                              type: "competition",
                              id: competition._id,
                              name: competition.name,
                            })
                          }
                          aria-label={`Delete ${competition.name}`}
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

        <TabsContent value="categories" className="mt-0">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No categories yet. Tap + to add your first category.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {categories.map((category) => (
                <Card key={category._id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          {category.name}
                        </CardTitle>
                        <CardDescription>
                          {category.category_id}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditCategory(category)}
                          aria-label={`Edit ${category.name}`}
                        >
                          <IconPencil />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setDeleteTarget({
                              type: "category",
                              id: category._id,
                              name: category.name,
                            })
                          }
                          aria-label={`Delete ${category.name}`}
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
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col gap-4 sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {isCompetitionSheet
                ? editingCompetitionId
                  ? "Edit competition"
                  : "New competition"
                : editingCategoryId
                  ? "Edit category"
                  : "New category"}
            </SheetTitle>
          </SheetHeader>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {isCompetitionSheet ? (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
              <Field label="Name">
                <Input
                  value={competitionForm.name}
                  onChange={(event) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. I-CRIVE 2027"
                />
              </Field>
              {editingCompetitionId ? (
                <p className="text-xs text-muted-foreground">
                  ID:{" "}
                  <span className="font-mono">
                    {
                      competitions.find(
                        (item) => item._id === editingCompetitionId
                      )?.competition_id
                    }
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  ID is generated from the name (e.g. &quot;I-CRIVE 2027&quot; →
                  i-crive-2027). Used in email subjects and the sign-off.
                </p>
              )}
              <Field label="Formal name (emails)">
                <Input
                  value={competitionForm.formal_name}
                  onChange={(event) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      formal_name: event.target.value,
                    }))
                  }
                  placeholder="e.g. International Competition for Research, Innovation & Value Excellence (I-CRIVE 2027)"
                />
              </Field>
              <Field label="Theme (emails)">
                <Input
                  value={competitionForm.theme}
                  onChange={(event) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      theme: event.target.value,
                    }))
                  }
                  placeholder="e.g. Innovating for a Smarter, Sustainable Future"
                />
              </Field>
              <Field label="Start date">
                <Input
                  type="date"
                  value={competitionForm.start_date}
                  onChange={(event) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      start_date: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="End date">
                <Input
                  type="date"
                  value={competitionForm.end_date}
                  onChange={(event) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      end_date: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Payment deadline">
                <Input
                  type="date"
                  value={competitionForm.payment_deadline}
                  onChange={(event) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      payment_deadline: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Judging start date">
                <Input
                  type="date"
                  value={competitionForm.judging_start_date}
                  onChange={(event) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      judging_start_date: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Scoring due date">
                <Input
                  type="date"
                  value={competitionForm.judging_due_date}
                  onChange={(event) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      judging_due_date: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Closing ceremony date">
                <Input
                  type="date"
                  value={competitionForm.closing_ceremony_date}
                  onChange={(event) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      closing_ceremony_date: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Closing ceremony mode">
                <Select
                  value={competitionForm.closing_ceremony_mode}
                  onValueChange={(value) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      closing_ceremony_mode: value as ClosingCeremonyMode,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {closingCeremonyModeSchema.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {CLOSING_CEREMONY_MODE_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Closing ceremony time (optional)">
                <Input
                  type="time"
                  value={competitionForm.closing_ceremony_time}
                  onChange={(event) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      closing_ceremony_time: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to show &quot;time to be confirmed&quot; in emails.
                </p>
              </Field>
              <Field label="Status">
                <Select
                  value={competitionForm.status}
                  onValueChange={(value) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      status: value as CompetitionStatus,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                    <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Open to">
                <Select
                  value={competitionForm.eligibility}
                  onValueChange={(value) =>
                    setCompetitionForm((current) => ({
                      ...current,
                      eligibility: value as CompetitionEligibility,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    {competitionEligibilitySchema.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {COMPETITION_ELIGIBILITY_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}

          {isCategorySheet ? (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
              <Field label="Name">
                <Input
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Undergraduate Thesis"
                />
              </Field>
              {editingCategoryId ? (
                <p className="text-xs text-muted-foreground">
                  ID:{" "}
                  <span className="font-mono">
                    {
                      categories.find((item) => item._id === editingCategoryId)
                        ?.category_id
                    }
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  ID is generated from the name (e.g. &quot;Undergraduate
                  Thesis&quot; → undergraduate-thesis).
                </p>
              )}
            </div>
          ) : null}

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={
                isCompetitionSheet
                  ? handleSaveCompetition
                  : handleSaveCategory
              }
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
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
