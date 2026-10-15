"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

import {
  Field,
  FieldError,
  fileInputClassName,
  mutedTextClassName,
} from "@/components/registrationFormUi";

const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function PaymentReceiptForm({
  token,
  replacing,
}: {
  token: string;
  replacing: boolean;
}) {
  const [fileName, setFileName] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setFileName(file.name);
    setReceiptUrl("");
    setUploading(true);
    try {
      const blob = await upload(`receipts/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
      });
      setReceiptUrl(blob.url);
    } catch (uploadError) {
      setFileName("");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed. Try again."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!receiptUrl) {
      setError("Upload your transfer receipt first.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/pay/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_url: receiptUrl }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: unknown;
      } | null;
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Could not submit the receipt."
        );
        return;
      }
      setDone(true);
    } catch {
      setError("Could not submit the receipt.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className={mutedTextClassName}>
        Receipt received. The secretariat will confirm the transfer.
      </p>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <Field id="receipt" label={replacing ? "Replace receipt" : "Transfer receipt"}>
        <input
          id="receipt"
          type="file"
          accept={RECEIPT_ACCEPT}
          disabled={uploading || submitting}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
          className={fileInputClassName}
        />
        {uploading ? <p className={mutedTextClassName}>Uploading…</p> : null}
        {receiptUrl && !uploading ? (
          <p className={`truncate ${mutedTextClassName}`}>Uploaded: {fileName}</p>
        ) : null}
      </Field>
      <FieldError message={error} />
      <button
        type="submit"
        disabled={uploading || submitting || !receiptUrl}
        className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        {submitting ? "Submitting…" : replacing ? "Replace receipt" : "Submit receipt"}
      </button>
      <p className={mutedTextClassName}>
        {replacing
          ? "Submitting a new file replaces the receipt the secretariat has not checked yet."
          : "PDF or image, up to 100 MB."}
      </p>
    </form>
  );
}
