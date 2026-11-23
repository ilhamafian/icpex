"use client";

import { FormEvent, useState } from "react";
import { upload } from "@vercel/blob/client";

import {
  Field,
  FieldError,
  fileInputClassName,
  inputClassName,
  mutedTextClassName,
} from "@/components/registrationFormUi";
import {
  acceptAttrForFormats,
  formatLabels,
} from "@/schemas/documentRequirement";
import type { DocumentUploadFile } from "@/utils/documentUploadTypes";

export function DocumentUploadForm({
  token,
  requirements,
}: {
  token: string;
  requirements: DocumentUploadFile[];
}) {
  const [files, setFiles] = useState<
    Record<string, { fileName: string; fileUrl: string; uploading: boolean }>
  >({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function setFile(
    requirementId: string,
    patch: Partial<{ fileName: string; fileUrl: string; uploading: boolean }>
  ) {
    setFiles((current) => {
      const previous = current[requirementId] ?? {
        fileName: "",
        fileUrl: "",
        uploading: false,
      };
      return {
        ...current,
        [requirementId]: { ...previous, ...patch },
      };
    });
  }

  async function handleFile(requirementId: string, file: File | undefined) {
    if (!file) return;
    setError("");
    setFile(requirementId, { fileName: file.name, fileUrl: "", uploading: true });
    try {
      const blob = await upload(`registrations/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
      });
      setFile(requirementId, {
        fileName: file.name,
        fileUrl: blob.url,
        uploading: false,
      });
    } catch (uploadError) {
      setFile(requirementId, { fileName: "", fileUrl: "", uploading: false });
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed. Try again."
      );
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (Object.values(files).some((file) => file.uploading)) {
      setError("Please wait for document uploads to finish.");
      return;
    }

    const documents = requirements.flatMap((requirement) => {
      if (requirement.inputType === "LINK") {
        const url = links[requirement.requirementId]?.trim() ?? "";
        if (!url) return [];
        return [
          {
            requirement_id: requirement.requirementId,
            file_name: requirement.label,
            file_url: url,
          },
        ];
      }
      const file = files[requirement.requirementId];
      if (!file?.fileUrl) return [];
      return [
        {
          requirement_id: requirement.requirementId,
          file_name: file.fileName,
          file_url: file.fileUrl,
        },
      ];
    });

    const missing = requirements.find((requirement) => {
      if (!requirement.required) return false;
      return !documents.some(
        (document) => document.requirement_id === requirement.requirementId
      );
    });
    if (missing) {
      setError(
        missing.inputType === "LINK"
          ? `${missing.label} is required.`
          : `Please upload your ${missing.label.toLowerCase()}.`
      );
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/upload/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: unknown;
      } | null;
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Could not submit the documents."
        );
        return;
      }
      setDone(true);
    } catch {
      setError("Could not submit the documents.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className={`mt-8 ${mutedTextClassName}`}>
        Submission received. To correct or replace a file, contact the
        secretariat.
      </p>
    );
  }

  const uploading = Object.values(files).some((file) => file.uploading);

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mt-8 flex flex-col gap-6 border-t border-black/10 pt-6 dark:border-white/10"
    >
      {requirements.map((requirement) => {
        const label = requirement.required
          ? requirement.label
          : `${requirement.label} (optional)`;
        if (requirement.inputType === "LINK") {
          return (
            <Field
              key={requirement.requirementId}
              id={requirement.requirementId}
              label={label}
            >
              <input
                id={requirement.requirementId}
                type="url"
                inputMode="url"
                value={links[requirement.requirementId] ?? ""}
                onChange={(event) =>
                  setLinks((current) => ({
                    ...current,
                    [requirement.requirementId]: event.target.value,
                  }))
                }
                placeholder="https://youtube.com/… or https://drive.google.com/…"
                className={inputClassName}
                disabled={submitting}
              />
              <p className={mutedTextClassName}>
                Paste a {formatLabels(requirement.acceptedFormats)} link.
              </p>
            </Field>
          );
        }

        const file = files[requirement.requirementId];
        return (
          <Field
            key={requirement.requirementId}
            id={requirement.requirementId}
            label={label}
          >
            <input
              id={requirement.requirementId}
              type="file"
              accept={acceptAttrForFormats(requirement.acceptedFormats)}
              disabled={submitting || file?.uploading}
              onChange={(event) => {
                void handleFile(
                  requirement.requirementId,
                  event.target.files?.[0]
                );
                event.target.value = "";
              }}
              className={fileInputClassName}
            />
            <p className={mutedTextClassName}>
              Accepted: {formatLabels(requirement.acceptedFormats)} (up to 100
              MB).
            </p>
            {file?.uploading ? (
              <p className={mutedTextClassName}>Uploading…</p>
            ) : null}
            {file?.fileUrl && !file.uploading ? (
              <p className={`truncate ${mutedTextClassName}`}>
                Uploaded: {file.fileName}
              </p>
            ) : null}
          </Field>
        );
      })}
      <FieldError message={error} />
      <button
        type="submit"
        disabled={uploading || submitting}
        className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        {submitting ? "Submitting…" : "Submit documents"}
      </button>
    </form>
  );
}
