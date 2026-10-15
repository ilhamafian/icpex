import "server-only";

import { get } from "@vercel/blob";
import { downloadZip } from "client-zip";

import type { Registration } from "@/schemas/registrationSchema";

type DocumentType = Registration["documents"][number]["type"];

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  ABSTRACT: "Abstract",
  FULL_PAPER: "Full paper",
  VIDEO_LINK: "Video link",
  PROJECT_REPORT: "Report",
  PROJECT_PRESENTATION: "Presentation",
  PROJECT_DEMO: "Demo",
  PROJECT_VIDEO: "Video",
  PROJECT_PHOTO: "Photo",
  PROJECT_OTHER: "Other",
};

/** Characters Windows and macOS reject in file and folder names. */
export function safeFileName(name: string) {
  return (
    name
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 150) || "untitled"
  );
}

function registrationFolder(registration: Registration) {
  return safeFileName(
    `${registration.registration_number} - ${registration.participant.name}`
  );
}

type ZipEntry = { name: string; input: ReadableStream<Uint8Array> | string };

async function* registrationEntries(
  registration: Registration,
  folder: string,
  errors: string[]
): AsyncGenerator<ZipEntry> {
  const prefix = folder ? `${folder}/` : "";
  const used = new Set<string>();
  const uniqueName = (name: string) => {
    let candidate = name;
    for (let n = 2; used.has(candidate.toLowerCase()); n++) {
      const dot = name.lastIndexOf(".");
      candidate =
        dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  };

  for (const doc of registration.documents) {
    const label = DOCUMENT_LABELS[doc.type];

    if (doc.type === "VIDEO_LINK") {
      yield {
        name: `${prefix}${uniqueName("Video link.txt")}`,
        input: `${doc.file_url}\r\n`,
      };
      continue;
    }

    const name = uniqueName(safeFileName(`${label} - ${doc.file_name}`));
    try {
      const result = await get(doc.file_url, { access: "private" });
      if (!result || result.statusCode !== 200) {
        throw new Error("file not found");
      }
      yield { name: `${prefix}${name}`, input: result.stream };
    } catch (error) {
      errors.push(
        `${registration.registration_number}: ${label} "${doc.file_name}" could not be downloaded (${
          error instanceof Error ? error.message : "unknown error"
        }).`
      );
    }
  }
}

async function* zipEntries(
  registrations: Registration[],
  useFolders: boolean
): AsyncGenerator<ZipEntry> {
  const errors: string[] = [];
  for (const registration of registrations) {
    yield* registrationEntries(
      registration,
      useFolders ? registrationFolder(registration) : "",
      errors
    );
  }
  if (errors.length) {
    yield {
      name: "_download-errors.txt",
      input: `Some files could not be included:\r\n\r\n${errors.join("\r\n")}\r\n`,
    };
  }
}

/**
 * Streams the documents as a zip, one file at a time, so large uploads are
 * never held in memory. Video links are written as text files.
 */
export function documentsZipResponse(
  registrations: Registration[],
  fileName: string,
  { useFolders }: { useFolders: boolean }
) {
  const zip = downloadZip(zipEntries(registrations, useFolders));
  return new Response(zip.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeFileName(fileName)}"`,
      "Cache-Control": "no-store",
    },
  });
}
