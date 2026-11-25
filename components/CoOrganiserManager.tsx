"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
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
import { MAX_CO_ORGANISERS } from "@/schemas/coOrganiserSchema";
import type { SerializedCoOrganiser } from "@/utils/serializeCoOrganiser";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type Draft = {
  key: string;
  name: string;
  file: File | null;
};

function newDraft(): Draft {
  return { key: crypto.randomUUID(), name: "", file: null };
}

export function CoOrganiserManager({
  initialLogos,
}: {
  initialLogos: SerializedCoOrganiser[];
}) {
  const [logos, setLogos] = useState(initialLogos);
  const [drafts, setDrafts] = useState<Draft[]>([
    { key: "draft-1", name: "", file: null },
  ]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SerializedCoOrganiser | null>(
    null
  );

  const atLimit = logos.length + drafts.length >= MAX_CO_ORGANISERS;

  function addDraft() {
    if (logos.length + drafts.length >= MAX_CO_ORGANISERS) {
      toast.error(`You can add up to ${MAX_CO_ORGANISERS} co-organisers.`);
      return;
    }
    setDrafts((current) => [...current, newDraft()]);
  }

  function updateDraft(key: string, patch: Partial<Pick<Draft, "name" | "file">>) {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft))
    );
  }

  async function saveDraft(draft: Draft) {
    const trimmed = draft.name.trim();
    if (!trimmed) {
      toast.error("Enter this co-organiser's name.");
      return;
    }
    if (!draft.file) {
      toast.error("Choose a logo for this co-organiser.");
      return;
    }
    if (!draft.file.type.startsWith("image/") || draft.file.type === "image/svg+xml") {
      toast.error("Choose a JPG, PNG, WebP or GIF logo.");
      return;
    }
    if (draft.file.size > MAX_IMAGE_BYTES) {
      toast.error("Logo must be 4 MB or smaller.");
      return;
    }
    if (logos.length >= MAX_CO_ORGANISERS) {
      toast.error(`You can add up to ${MAX_CO_ORGANISERS} co-organisers.`);
      return;
    }

    setSavingKey(draft.key);
    try {
      const blob = await upload(`co-organisers/${draft.file.name}`, draft.file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
      });
      const response = await fetch("/api/co-organisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, image_url: blob.url }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "Could not save co-organiser."
        );
        return;
      }
      setLogos((current) => [...current, data.logo as SerializedCoOrganiser]);
      setDrafts((current) => current.filter((item) => item.key !== draft.key));
      toast.success("Co-organiser added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed. Try again.");
    } finally {
      setSavingKey(null);
    }
  }

  async function move(id: string, direction: "earlier" | "later") {
    const response = await fetch(`/api/co-organisers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(
        typeof data.error === "string" ? data.error : "Could not reorder co-organisers."
      );
      return;
    }
    setLogos(data.logos as SerializedCoOrganiser[]);
  }

  async function remove(logo: SerializedCoOrganiser) {
    setPendingDelete(null);
    const response = await fetch(`/api/co-organisers/${logo._id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Could not remove co-organiser.");
      return;
    }
    setLogos((current) => current.filter((item) => item._id !== logo._id));
    toast.success("Co-organiser removed.");
  }

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Co-organisers</CardTitle>
          <CardDescription>
            Add each co-organiser with its own name and logo. They appear in the
            landing page footer. Logos are JPG, PNG, WebP or GIF up to 4 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {logos.length === 0 && drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No co-organisers yet. The footer says “To be announced” until you add one.
            </p>
          ) : null}

          <ul className="flex flex-col gap-3">
            {logos.map((logo, index) => (
              <li
                key={logo._id}
                className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo.image_src}
                  alt=""
                  className="h-14 w-24 shrink-0 rounded-lg bg-white object-contain p-1"
                />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{logo.name}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Move ${logo.name} earlier`}
                    disabled={index === 0}
                    onClick={() => void move(logo._id, "earlier")}
                  >
                    <IconChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Move ${logo.name} later`}
                    disabled={index === logos.length - 1}
                    onClick={() => void move(logo._id, "later")}
                  >
                    <IconChevronRight />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingDelete(logo)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}

            {drafts.map((draft, index) => {
              const saving = savingKey === draft.key;
              const number = logos.length + index + 1;
              return (
                <li
                  key={draft.key}
                  className="flex flex-col gap-3 rounded-xl border border-dashed p-3 sm:flex-row sm:items-end"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Label htmlFor={`co-organiser-name-${draft.key}`}>
                      Name {number}
                    </Label>
                    <Input
                      id={`co-organiser-name-${draft.key}`}
                      value={draft.name}
                      maxLength={80}
                      placeholder="e.g. Universiti Kuala Lumpur"
                      disabled={saving}
                      onChange={(event) =>
                        updateDraft(draft.key, { name: event.target.value })
                      }
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor={`co-organiser-logo-${draft.key}`}>Logo {number}</Label>
                    <div className="flex h-9 items-center gap-2">
                      <Button variant="outline" asChild disabled={saving}>
                        <label
                          htmlFor={`co-organiser-logo-${draft.key}`}
                          className={
                            saving ? "pointer-events-none opacity-50" : "cursor-pointer"
                          }
                        >
                          Choose logo
                        </label>
                      </Button>
                      <input
                        id={`co-organiser-logo-${draft.key}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        disabled={saving}
                        className="sr-only"
                        onChange={(event) =>
                          updateDraft(draft.key, {
                            file: event.target.files?.[0] ?? null,
                          })
                        }
                      />
                      <span className="max-w-40 truncate text-sm text-muted-foreground">
                        {draft.file ? draft.file.name : "No file chosen"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      onClick={() => void saveDraft(draft)}
                      disabled={saving || savingKey !== null}
                    >
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() =>
                        setDrafts((current) =>
                          current.filter((item) => item.key !== draft.key)
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={addDraft}
              disabled={atLimit || savingKey !== null}
            >
              <IconPlus />
              Add co-organiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this co-organiser?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.name} will disappear from the landing page footer.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) void remove(pendingDelete);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
