"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";

import { FilePicker } from "@/components/FilePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  acceptAttrForFormats,
  formatLabels,
} from "@/schemas/documentRequirement";
import type { DocumentUploadFile } from "@/utils/documentUploadTypes";
import type { SubmissionPaymentGroup } from "@/utils/submissionPayments";

export function DocumentReplaceDialog({
  open,
  onOpenChange,
  registrationId,
  registrationNumber,
  files,
  onReplaced,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  registrationNumber: string;
  files: DocumentUploadFile[];
  onReplaced: (group: SubmissionPaymentGroup) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});

  async function save(
    file: DocumentUploadFile,
    next: { fileName: string; fileUrl: string }
  ) {
    setBusyId(file.requirementId);
    try {
      const res = await fetch(`/api/registrations/${registrationId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirement_id: file.requirementId,
          file_name: next.fileName,
          file_url: next.fileUrl,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: unknown;
        group?: SubmissionPaymentGroup | null;
      } | null;
      if (!res.ok || !data?.group) {
        toast.error(
          typeof data?.error === "string"
            ? data.error
            : "Could not replace the document."
        );
        return;
      }
      onReplaced(data.group);
      toast.success(`${file.label} updated.`);
    } catch {
      toast.error("Could not replace the document.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleFile(file: DocumentUploadFile, chosen: File | undefined) {
    if (!chosen) return;
    setBusyId(file.requirementId);
    try {
      const blob = await upload(`registrations/${chosen.name}`, chosen, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
      });
      await save(file, { fileName: chosen.name, fileUrl: blob.url });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Documents for {registrationNumber}</DialogTitle>
          <DialogDescription>
            The participant can no longer change these. Replace a file or link
            here.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {files.map((file) => {
            const busy = busyId === file.requirementId;
            return (
              <div key={file.requirementId} className="flex flex-col gap-2">
                <Label htmlFor={file.requirementId}>
                  {file.label}
                  {file.required ? "" : " (optional)"}
                </Label>
                <p className="truncate text-xs text-muted-foreground">
                  {file.fileName ? (
                    file.fileUrl ? (
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        {file.fileName}
                      </a>
                    ) : (
                      file.fileName
                    )
                  ) : (
                    "Not submitted"
                  )}
                </p>
                {file.inputType === "LINK" ? (
                  <div className="flex gap-2">
                    <Input
                      id={file.requirementId}
                      type="url"
                      value={links[file.requirementId] ?? ""}
                      placeholder={`Paste a ${formatLabels(file.acceptedFormats)} link`}
                      disabled={busyId !== null}
                      onChange={(event) =>
                        setLinks((current) => ({
                          ...current,
                          [file.requirementId]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        busyId !== null ||
                        !(links[file.requirementId] ?? "").trim()
                      }
                      onClick={() =>
                        void save(file, {
                          fileName: file.label,
                          fileUrl: links[file.requirementId].trim(),
                        })
                      }
                    >
                      {busy ? "Saving…" : "Save"}
                    </Button>
                  </div>
                ) : (
                  <FilePicker
                    id={file.requirementId}
                    accept={acceptAttrForFormats(file.acceptedFormats)}
                    disabled={busyId !== null}
                    uploading={busy}
                    fileName={file.fileName}
                    showName={false}
                    onFile={(chosen) => void handleFile(file, chosen)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
