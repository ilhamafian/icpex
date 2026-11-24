"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPhoto,
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

export function CoOrganiserManager({
  initialLogos,
}: {
  initialLogos: SerializedCoOrganiser[];
}) {
  const [logos, setLogos] = useState(initialLogos);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SerializedCoOrganiser | null>(
    null
  );

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter the co-organiser's name first.");
      return;
    }
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      toast.error("Choose a JPG, PNG, WebP or GIF logo.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Logo must be 4 MB or smaller.");
      return;
    }
    if (logos.length >= MAX_CO_ORGANISERS) {
      toast.error(`You can add up to ${MAX_CO_ORGANISERS} logos.`);
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(`co-organisers/${file.name}`, file, {
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
          typeof data.error === "string" ? data.error : "Could not save logo."
        );
        return;
      }
      setLogos((current) => [...current, data.logo as SerializedCoOrganiser]);
      setName("");
      toast.success("Logo added to the landing page.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
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
        typeof data.error === "string" ? data.error : "Could not reorder logos."
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
      toast.error("Could not remove logo.");
      return;
    }
    setLogos((current) => current.filter((item) => item._id !== logo._id));
    toast.success("Logo removed.");
  }

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Co-organisers</CardTitle>
          <CardDescription>
            Logos appear in the landing page footer. Upload a JPG, PNG, WebP or
            GIF up to 4 MB. The name is the text read out for the logo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label htmlFor="co-organiser-name">Name</Label>
              <Input
                id="co-organiser-name"
                value={name}
                maxLength={80}
                placeholder="e.g. Universiti Kuala Lumpur"
                disabled={uploading}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <Button variant="outline" asChild disabled={uploading}>
              <label className="cursor-pointer">
                <IconPhoto />
                {uploading ? "Uploading…" : "Upload logo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => {
                    void handleUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </Button>
          </div>

          {logos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No logos yet. The footer says “To be announced” until you add one.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {logos.map((logo, index) => (
                <li
                  key={logo._id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.image_src}
                    alt=""
                    className="h-14 w-24 shrink-0 rounded-lg bg-white object-contain p-1"
                  />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {logo.name}
                  </p>
                  <div className="flex shrink-0 gap-1">
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
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${logo.name}`}
                      onClick={() => setPendingDelete(logo)}
                    >
                      <IconTrash />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
            <AlertDialogTitle>Remove this logo?</AlertDialogTitle>
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
