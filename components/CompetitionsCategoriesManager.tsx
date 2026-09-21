"use client";

import { useState } from "react";
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
import type { CompetitionStatus } from "@/schemas/competitionSchema";
import type {
  SerializedCategory,
  SerializedCompetition,
} from "@/utils/serializeCatalog";

type Tab = "competitions" | "categories";

type CompetitionFormState = {
  name: string;
  start_date: string;
  end_date: string;
  status: CompetitionStatus;
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
    start_date: "",
    end_date: "",
    status: "DRAFT",
  };
}

function competitionToForm(
  competition: SerializedCompetition
): CompetitionFormState {
  return {
    name: competition.name,
    start_date: toDateInputValue(competition.start_date),
    end_date: toDateInputValue(competition.end_date),
    status: competition.status,
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
  initialCategories,
}: {
  initialCompetitions: SerializedCompetition[];
  initialCategories: SerializedCategory[];
}) {
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
    if (!competitionForm.start_date || !competitionForm.end_date) {
      setError("Start and end dates are required.");
      return;
    }

    const payload = {
      name: competitionForm.name.trim(),
      start_date: competitionForm.start_date,
      end_date: competitionForm.end_date,
      status: competitionForm.status,
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
            form.
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
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
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
        <SheetContent className="flex flex-col gap-4 sm:max-w-md">
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
                  placeholder="e.g. ICPEX 2026"
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
                  ID is generated from the name (e.g. &quot;ICPEX 2026&quot; →
                  icpex-2026).
                </p>
              )}
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
