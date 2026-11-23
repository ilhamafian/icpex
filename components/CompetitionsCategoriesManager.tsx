"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconMail, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";

import { CampusInvitationDialog } from "@/components/CampusInvitationDialog";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CLOSING_CEREMONY_MODE_LABELS,
  closingCeremonyModeSchema,
  type ClosingCeremonyMode,
  type CompetitionStatus,
} from "@/schemas/competitionSchema";
import {
  DOCUMENT_FORMAT_LABELS,
  FILE_FORMAT_OPTIONS,
  LINK_FORMAT_OPTIONS,
  defaultDocumentRequirements,
  emptyDocumentRequirement,
  type DocumentRequirement,
} from "@/schemas/documentRequirement";
import {
  COMPETITION_ELIGIBILITY_LABELS,
  allowedEducationLevels,
  competitionEligibilitySchema,
  EDUCATION_LEVEL_LABELS,
  educationLevelSchema,
  type CompetitionEligibility,
  type EducationLevel,
} from "@/schemas/educationLevel";
import type {
  SerializedCategory,
  SerializedCompetition,
} from "@/utils/serializeCatalog";

type Tab = "competitions" | "categories";

const COMPETITION_STEPS = [
  { id: "details", label: "Details" },
  { id: "eligibility", label: "Eligibility" },
  { id: "documents", label: "Documents" },
  { id: "schedule", label: "Schedule" },
] as const;

type CompetitionStep = 0 | 1 | 2 | 3;

type CompetitionFormState = {
  name: string;
  formal_name: string;
  theme: string;
  undergraduate_stream_name: string;
  postgraduate_stream_name: string;
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
  document_requirements: DocumentRequirement[];
};

type CategoryFormState = {
  name: string;
  education_level: EducationLevel;
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
    undergraduate_stream_name: "",
    postgraduate_stream_name: "",
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
    document_requirements: defaultDocumentRequirements("BOTH"),
  };
}

function competitionToForm(
  competition: SerializedCompetition
): CompetitionFormState {
  return {
    name: competition.name,
    formal_name: competition.formal_name ?? "",
    theme: competition.theme ?? "",
    undergraduate_stream_name: competition.undergraduate_stream_name ?? "",
    postgraduate_stream_name: competition.postgraduate_stream_name ?? "",
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
    document_requirements:
      competition.document_requirements &&
      competition.document_requirements.length > 0
        ? competition.document_requirements
        : defaultDocumentRequirements(competition.eligibility),
  };
}

function emptyCategoryForm(): CategoryFormState {
  return { name: "", education_level: "UNDERGRADUATE" };
}

function categoryToForm(category: SerializedCategory): CategoryFormState {
  return {
    name: category.name,
    education_level: category.education_level ?? "UNDERGRADUATE",
  };
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [competitionStep, setCompetitionStep] = useState<CompetitionStep>(0);
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
  const [inviteCompetitionId, setInviteCompetitionId] = useState<string | null>(
    null
  );

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setCompetitionStep(0);
      setError(null);
    }
  }

  function openCreateCompetition() {
    setEditingCompetitionId(null);
    setEditingCategoryId(null);
    setCompetitionForm(emptyCompetitionForm());
    setCompetitionStep(0);
    setError(null);
    setDialogOpen(true);
  }

  function openEditCompetition(competition: SerializedCompetition) {
    setEditingCompetitionId(competition._id);
    setEditingCategoryId(null);
    setCompetitionForm(competitionToForm(competition));
    setCompetitionStep(0);
    setError(null);
    setDialogOpen(true);
  }

  function openCreateCategory() {
    setEditingCategoryId(null);
    setEditingCompetitionId(null);
    setCategoryForm(emptyCategoryForm());
    setError(null);
    setDialogOpen(true);
  }

  function openEditCategory(category: SerializedCategory) {
    setEditingCategoryId(category._id);
    setEditingCompetitionId(null);
    setCategoryForm(categoryToForm(category));
    setError(null);
    setDialogOpen(true);
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

  function validateCompetitionStep(step: CompetitionStep): string | null {
    if (step === 0) {
      if (!competitionForm.name.trim()) return "Competition name is required.";
      if (!competitionForm.formal_name.trim())
        return "Formal name is required for emails.";
      if (!competitionForm.theme.trim()) return "Theme is required for emails.";
      return null;
    }

    if (step === 1) {
      const needsUndergrad =
        competitionForm.eligibility === "UNDERGRADUATE" ||
        competitionForm.eligibility === "BOTH";
      const needsPostgrad =
        competitionForm.eligibility === "POSTGRADUATE" ||
        competitionForm.eligibility === "BOTH";
      if (needsUndergrad && !competitionForm.undergraduate_stream_name.trim()) {
        return "Undergraduate stream name is required.";
      }
      if (needsPostgrad && !competitionForm.postgraduate_stream_name.trim()) {
        return "Postgraduate stream name is required.";
      }
      return null;
    }

    if (step === 2) {
      const levels = allowedEducationLevels(competitionForm.eligibility);
      for (const level of levels) {
        const levelDocs = competitionForm.document_requirements.filter(
          (requirement) => requirement.education_level === level
        );
        if (levelDocs.length === 0) {
          return `Add at least one document for ${EDUCATION_LEVEL_LABELS[level]}.`;
        }
        for (const requirement of levelDocs) {
          if (!requirement.name.trim()) {
            return `Document name is required (${EDUCATION_LEVEL_LABELS[level]}).`;
          }
          if (requirement.accepted_formats.length === 0) {
            return `Choose at least one format for "${requirement.name}".`;
          }
        }
      }
      return null;
    }

    if (!competitionForm.start_date || !competitionForm.end_date) {
      return "Start and end dates are required.";
    }
    if (!competitionForm.payment_deadline) {
      return "Payment deadline is required.";
    }
    if (!competitionForm.judging_start_date) {
      return "Judging start date is required.";
    }
    if (!competitionForm.judging_due_date) {
      return "Scoring due date is required.";
    }
    if (!competitionForm.closing_ceremony_date) {
      return "Closing ceremony date is required.";
    }
    return null;
  }

  function setEligibility(value: CompetitionEligibility) {
    setCompetitionForm((current) => {
      const levels = new Set(allowedEducationLevels(value));
      let document_requirements = current.document_requirements.filter(
        (requirement) => levels.has(requirement.education_level)
      );
      for (const level of levels) {
        if (
          !document_requirements.some(
            (requirement) => requirement.education_level === level
          )
        ) {
          document_requirements = [
            ...document_requirements,
            ...defaultDocumentRequirements(level),
          ];
        }
      }
      return {
        ...current,
        eligibility: value,
        document_requirements,
      };
    });
  }

  function updateDocumentRequirement(
    id: string,
    patch: Partial<DocumentRequirement>
  ) {
    setCompetitionForm((current) => ({
      ...current,
      document_requirements: current.document_requirements.map((requirement) =>
        requirement.id === id ? { ...requirement, ...patch } : requirement
      ),
    }));
  }

  function addDocumentRequirement(level: EducationLevel) {
    setCompetitionForm((current) => ({
      ...current,
      document_requirements: [
        ...current.document_requirements,
        emptyDocumentRequirement(level),
      ],
    }));
  }

  function removeDocumentRequirement(id: string) {
    setCompetitionForm((current) => ({
      ...current,
      document_requirements: current.document_requirements.filter(
        (requirement) => requirement.id !== id
      ),
    }));
  }

  function toggleDocumentFormat(id: string, format: string) {
    setCompetitionForm((current) => ({
      ...current,
      document_requirements: current.document_requirements.map((requirement) => {
        if (requirement.id !== id) return requirement;
        const has = requirement.accepted_formats.includes(format);
        const accepted_formats = has
          ? requirement.accepted_formats.filter((item) => item !== format)
          : [...requirement.accepted_formats, format];
        return { ...requirement, accepted_formats };
      }),
    }));
  }

  function goToNextCompetitionStep() {
    const stepError = validateCompetitionStep(competitionStep);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setCompetitionStep((current) =>
      Math.min(current + 1, COMPETITION_STEPS.length - 1) as CompetitionStep
    );
  }

  function goToPreviousCompetitionStep() {
    setError(null);
    setCompetitionStep((current) =>
      Math.max(current - 1, 0) as CompetitionStep
    );
  }

  async function handleSaveCompetition() {
    for (let step = 0; step < COMPETITION_STEPS.length; step += 1) {
      const stepError = validateCompetitionStep(step as CompetitionStep);
      if (stepError) {
        setCompetitionStep(step as CompetitionStep);
        setError(stepError);
        return;
      }
    }

    const needsUndergrad =
      competitionForm.eligibility === "UNDERGRADUATE" ||
      competitionForm.eligibility === "BOTH";
    const needsPostgrad =
      competitionForm.eligibility === "POSTGRADUATE" ||
      competitionForm.eligibility === "BOTH";

    const payload = {
      name: competitionForm.name.trim(),
      formal_name: competitionForm.formal_name.trim(),
      theme: competitionForm.theme.trim(),
      undergraduate_stream_name: needsUndergrad
        ? competitionForm.undergraduate_stream_name.trim()
        : undefined,
      postgraduate_stream_name: needsPostgrad
        ? competitionForm.postgraduate_stream_name.trim()
        : undefined,
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
      document_requirements: competitionForm.document_requirements
        .filter((requirement) =>
          allowedEducationLevels(competitionForm.eligibility).includes(
            requirement.education_level
          )
        )
        .map((requirement) => ({
          ...requirement,
          name: requirement.name.trim(),
        })),
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
      setDialogOpen(false);
      setCompetitionStep(0);
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
    if (!categoryForm.education_level) {
      setError("Choose undergraduate or postgraduate for this track.");
      return;
    }

    const payload = {
      name: categoryForm.name.trim(),
      education_level: categoryForm.education_level,
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
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const isCompetitionDialog =
    editingCompetitionId !== null ||
    (dialogOpen && editingCategoryId === null && tab === "competitions");
  const isCategoryDialog =
    editingCategoryId !== null ||
    (dialogOpen && editingCompetitionId === null && tab === "categories");
  const isLastCompetitionStep =
    competitionStep === COMPETITION_STEPS.length - 1;

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

        {error && !dialogOpen ? (
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
                          onClick={() => setInviteCompetitionId(competition._id)}
                          aria-label={`Send participant invitation for ${competition.name}`}
                          title="Send participant invitation"
                        >
                          <IconMail />
                        </Button>
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
                          {category.education_level
                            ? ` · ${EDUCATION_LEVEL_LABELS[category.education_level]}`
                            : " · No education level set"}
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

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[min(92vh,56rem)] w-full flex-col gap-4 overflow-hidden sm:!max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isCompetitionDialog
                ? editingCompetitionId
                  ? "Edit competition"
                  : "New competition"
                : editingCategoryId
                  ? "Edit category"
                  : "New category"}
            </DialogTitle>
            {isCompetitionDialog ? (
              <DialogDescription>
                Step {competitionStep + 1} of {COMPETITION_STEPS.length}:{" "}
                {COMPETITION_STEPS[competitionStep].label}
              </DialogDescription>
            ) : (
              <DialogDescription>
                Tracks shown on the public registration form.
              </DialogDescription>
            )}
          </DialogHeader>

          {isCompetitionDialog ? (
            <div className="flex items-center gap-2 px-0.5">
              {COMPETITION_STEPS.map((step, index) => {
                const active = index === competitionStep;
                const complete = index < competitionStep;
                return (
                  <div key={step.id} className="flex flex-1 flex-col gap-1.5">
                    <div
                      className={
                        active || complete
                          ? "h-1 rounded-full bg-primary"
                          : "h-1 rounded-full bg-muted"
                      }
                    />
                    <span
                      className={
                        active
                          ? "text-xs font-medium text-foreground"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {isCompetitionDialog ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
              {competitionStep === 0 ? (
                <>
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
                      ID is generated from the name (e.g. &quot;I-CRIVE
                      2027&quot; → i-crive-2027). Used in email subjects and
                      the sign-off.
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
                </>
              ) : null}

              {competitionStep === 1 ? (
                <>
                  <Field label="Open to">
                    <Select
                      value={competitionForm.eligibility}
                      onValueChange={(value) =>
                        setEligibility(value as CompetitionEligibility)
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
                  {competitionForm.eligibility === "UNDERGRADUATE" ||
                  competitionForm.eligibility === "BOTH" ? (
                    <Field label="Undergraduate stream name (emails)">
                      <Input
                        value={competitionForm.undergraduate_stream_name}
                        onChange={(event) =>
                          setCompetitionForm((current) => ({
                            ...current,
                            undergraduate_stream_name: event.target.value,
                          }))
                        }
                        placeholder="e.g. Undergraduate Innovation Competition"
                      />
                    </Field>
                  ) : null}
                  {competitionForm.eligibility === "POSTGRADUATE" ||
                  competitionForm.eligibility === "BOTH" ? (
                    <Field label="Postgraduate stream name (emails)">
                      <Input
                        value={competitionForm.postgraduate_stream_name}
                        onChange={(event) =>
                          setCompetitionForm((current) => ({
                            ...current,
                            postgraduate_stream_name: event.target.value,
                          }))
                        }
                        placeholder="e.g. Postgraduate Five-Minute Thesis (5MT) Competition (Master's and PhD will be assessed separately)"
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}

              {competitionStep === 2 ? (
                <div className="flex flex-col gap-6">
                  <p className="text-xs text-muted-foreground">
                    Configure which files or links each stream uploads.
                    Before payment collects them on the registration form.
                    After payment emails an upload link once payment is
                    confirmed. Undergraduate and postgraduate can differ.
                  </p>
                  {allowedEducationLevels(competitionForm.eligibility).map(
                    (level) => {
                      const levelDocs =
                        competitionForm.document_requirements.filter(
                          (requirement) =>
                            requirement.education_level === level
                        );
                      return (
                        <div key={level} className="flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-medium">
                              {EDUCATION_LEVEL_LABELS[level]}
                            </h3>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addDocumentRequirement(level)}
                            >
                              <IconPlus className="size-4" />
                              Add document
                            </Button>
                          </div>
                          {levelDocs.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No documents yet for this stream.
                            </p>
                          ) : (
                            levelDocs.map((requirement) => {
                              const formatOptions =
                                requirement.input_type === "LINK"
                                  ? LINK_FORMAT_OPTIONS
                                  : FILE_FORMAT_OPTIONS;
                              return (
                                <div
                                  key={requirement.id}
                                  className="flex flex-col gap-3 rounded-2xl border border-border/70 p-3"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <Field label="Document name">
                                      <Input
                                        value={requirement.name}
                                        onChange={(event) =>
                                          updateDocumentRequirement(
                                            requirement.id,
                                            { name: event.target.value }
                                          )
                                        }
                                        placeholder={
                                          level === "POSTGRADUATE"
                                            ? "e.g. 5MT slide"
                                            : "e.g. Abstract"
                                        }
                                      />
                                    </Field>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="mt-6 shrink-0 text-destructive"
                                      onClick={() =>
                                        removeDocumentRequirement(
                                          requirement.id
                                        )
                                      }
                                      aria-label={`Remove ${requirement.name || "document"}`}
                                    >
                                      <IconTrash />
                                    </Button>
                                  </div>
                                  <div className="grid gap-3 sm:grid-cols-3">
                                    <Field label="Input type">
                                      <Select
                                        value={requirement.input_type}
                                        onValueChange={(value) =>
                                          updateDocumentRequirement(
                                            requirement.id,
                                            {
                                              input_type: value as
                                                | "FILE"
                                                | "LINK",
                                              accepted_formats:
                                                value === "LINK"
                                                  ? ["youtube", "gdrive"]
                                                  : ["pdf"],
                                            }
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="FILE">
                                            File upload
                                          </SelectItem>
                                          <SelectItem value="LINK">
                                            Link
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </Field>
                                    <Field label="Required?">
                                      <Select
                                        value={
                                          requirement.required
                                            ? "required"
                                            : "optional"
                                        }
                                        onValueChange={(value) =>
                                          updateDocumentRequirement(
                                            requirement.id,
                                            {
                                              required: value === "required",
                                            }
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="required">
                                            Mandatory
                                          </SelectItem>
                                          <SelectItem value="optional">
                                            Optional
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </Field>
                                    <Field label="When to upload">
                                      <Select
                                        value={
                                          requirement.upload_timing ??
                                          "BEFORE_PAYMENT"
                                        }
                                        onValueChange={(value) =>
                                          updateDocumentRequirement(
                                            requirement.id,
                                            {
                                              upload_timing: value as
                                                | "BEFORE_PAYMENT"
                                                | "AFTER_PAYMENT",
                                            }
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="BEFORE_PAYMENT">
                                            Before payment
                                          </SelectItem>
                                          <SelectItem value="AFTER_PAYMENT">
                                            After payment
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </Field>
                                  </div>
                                  <Field
                                    label={
                                      requirement.input_type === "LINK"
                                        ? "Accepted link types"
                                        : "Accepted file formats"
                                    }
                                  >
                                    <div className="flex flex-wrap gap-2">
                                      {formatOptions.map((format) => {
                                        const checked =
                                          requirement.accepted_formats.includes(
                                            format
                                          );
                                        return (
                                          <label
                                            key={format}
                                            className={
                                              checked
                                                ? "inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                                                : "inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                                            }
                                          >
                                            <input
                                              type="checkbox"
                                              className="sr-only"
                                              checked={checked}
                                              onChange={() =>
                                                toggleDocumentFormat(
                                                  requirement.id,
                                                  format
                                                )
                                              }
                                            />
                                            {DOCUMENT_FORMAT_LABELS[format] ??
                                              format}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </Field>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              ) : null}

              {competitionStep === 3 ? (
                <>
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
                      Leave blank to show &quot;time to be confirmed&quot; in
                      emails.
                    </p>
                  </Field>
                </>
              ) : null}
            </div>
          ) : null}

          {isCategoryDialog ? (
            <div className="flex flex-col gap-4">
              <Field label="Name">
                <Input
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Artificial Intelligence & Software System"
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
              <Field label="Education stream">
                <Select
                  value={categoryForm.education_level}
                  onValueChange={(value) =>
                    setCategoryForm((current) => ({
                      ...current,
                      education_level: value as EducationLevel,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select stream" />
                  </SelectTrigger>
                  <SelectContent>
                    {educationLevelSchema.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {EDUCATION_LEVEL_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {isCompetitionDialog && competitionStep > 0 ? (
                <Button
                  variant="outline"
                  onClick={goToPreviousCompetitionStep}
                  disabled={saving}
                >
                  Back
                </Button>
              ) : null}
              {isCompetitionDialog && !isLastCompetitionStep ? (
                <Button onClick={goToNextCompetitionStep} disabled={saving}>
                  Next
                </Button>
              ) : (
                <Button
                  onClick={
                    isCompetitionDialog
                      ? () => void handleSaveCompetition()
                      : () => void handleSaveCategory()
                  }
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <CampusInvitationDialog
        open={Boolean(inviteCompetitionId)}
        onOpenChange={(open) => {
          if (!open) setInviteCompetitionId(null);
        }}
        competitions={competitions}
        competitionId={inviteCompetitionId}
      />
    </div>
  );
}
