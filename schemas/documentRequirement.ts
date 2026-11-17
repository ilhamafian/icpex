import { z } from "zod";

import {
  allowedEducationLevels,
  educationLevelSchema,
  type CompetitionEligibility,
  type EducationLevel,
} from "./educationLevel";

export const documentInputTypeSchema = z.enum(["FILE", "LINK"]);

export type DocumentInputType = z.infer<typeof documentInputTypeSchema>;

/** File extensions (without dot) and link hosts admins can allow. */
export const FILE_FORMAT_OPTIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "zip",
  "jpg",
  "jpeg",
  "png",
] as const;

export const LINK_FORMAT_OPTIONS = ["youtube", "gdrive"] as const;

export const DOCUMENT_FORMAT_LABELS: Record<string, string> = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOCX",
  ppt: "PPT",
  pptx: "PPTX",
  zip: "ZIP",
  jpg: "JPG",
  jpeg: "JPEG",
  png: "PNG",
  youtube: "YouTube",
  gdrive: "Google Drive",
};

export const documentRequirementSchema = z.object({
  id: z.string().min(1),
  /** Display name on the registration form and in emails. */
  name: z.string().trim().min(1),
  /** Which education stream this upload applies to. */
  education_level: educationLevelSchema,
  input_type: documentInputTypeSchema,
  /** Allowed extensions (FILE) or link kinds (LINK). */
  accepted_formats: z.array(z.string().trim().min(1)).min(1),
  required: z.boolean(),
});

export type DocumentRequirement = z.infer<typeof documentRequirementSchema>;

export const documentRequirementsSchema = z.array(documentRequirementSchema);

/** Build the HTML `accept` attribute from file format codes. */
export function acceptAttrForFormats(formats: string[]) {
  return formats
    .map((format) => (format.startsWith(".") ? format : `.${format}`))
    .join(",");
}

export function formatLabels(formats: string[]) {
  return formats
    .map((format) => DOCUMENT_FORMAT_LABELS[format] ?? format.toUpperCase())
    .join(", ");
}

export function requirementsForLevel(
  requirements: DocumentRequirement[] | undefined,
  level: EducationLevel
) {
  return (requirements ?? []).filter(
    (requirement) => requirement.education_level === level
  );
}

function defaultRequirement(
  id: string,
  name: string,
  educationLevel: EducationLevel,
  inputType: DocumentInputType,
  acceptedFormats: string[],
  required: boolean
): DocumentRequirement {
  return {
    id,
    name,
    education_level: educationLevel,
    input_type: inputType,
    accepted_formats: acceptedFormats,
    required,
  };
}

/**
 * Defaults matching the previous hardcoded registration uploads.
 * Postgraduate also gets an optional 5MT slide. IDs are stable so forms
 * remount cleanly before an admin saves custom requirements.
 */
export function defaultDocumentRequirements(
  eligibility: CompetitionEligibility = "BOTH"
): DocumentRequirement[] {
  const levels = allowedEducationLevels(eligibility);
  const requirements: DocumentRequirement[] = [];

  for (const level of levels) {
    const prefix = level === "UNDERGRADUATE" ? "ug" : "pg";
    requirements.push(
      defaultRequirement(
        `${prefix}-abstract`,
        "Abstract",
        level,
        "FILE",
        ["pdf", "doc", "docx"],
        true
      ),
      defaultRequirement(
        `${prefix}-full-paper`,
        "Full paper",
        level,
        "FILE",
        ["pdf", "doc", "docx"],
        false
      ),
      defaultRequirement(
        `${prefix}-video-link`,
        "Video link",
        level,
        "LINK",
        ["youtube", "gdrive"],
        true
      )
    );

    if (level === "POSTGRADUATE") {
      requirements.push(
        defaultRequirement(
          "pg-5mt-slide",
          "5MT slide",
          level,
          "FILE",
          ["ppt", "pptx", "pdf"],
          false
        )
      );
    }
  }

  return requirements;
}

/** Prefer saved requirements; otherwise fall back to legacy defaults. */
export function effectiveDocumentRequirements(
  competition: {
    eligibility?: CompetitionEligibility;
    document_requirements?: DocumentRequirement[];
  } | null | undefined
): DocumentRequirement[] {
  if (
    competition?.document_requirements &&
    competition.document_requirements.length > 0
  ) {
    return competition.document_requirements;
  }
  return defaultDocumentRequirements(competition?.eligibility ?? "BOTH");
}

/**
 * Map a configured requirement onto the legacy registration document `type`
 * so judge tables, zips, and older UI keep working.
 */
export function storageTypeForRequirement(
  requirement: Pick<DocumentRequirement, "name" | "input_type">
) {
  if (requirement.input_type === "LINK") return "VIDEO_LINK" as const;

  const name = requirement.name.trim().toLowerCase();
  if (name.includes("abstract")) return "ABSTRACT" as const;
  if (name.includes("full paper") || name.includes("fullpaper")) {
    return "FULL_PAPER" as const;
  }
  if (
    name.includes("5mt") ||
    name.includes("slide") ||
    name.includes("presentation")
  ) {
    return "PROJECT_PRESENTATION" as const;
  }
  if (name.includes("report")) return "PROJECT_REPORT" as const;
  if (name.includes("photo")) return "PROJECT_PHOTO" as const;
  if (name.includes("demo")) return "PROJECT_DEMO" as const;
  if (name.includes("video")) return "PROJECT_VIDEO" as const;
  return "PROJECT_OTHER" as const;
}

export function emptyDocumentRequirement(
  educationLevel: EducationLevel
): DocumentRequirement {
  return {
    id: crypto.randomUUID(),
    name: "",
    education_level: educationLevel,
    input_type: "FILE",
    accepted_formats: ["pdf"],
    required: true,
  };
}

export type SubmittedDocument = {
  requirement_id?: string;
  label?: string;
  type: string;
  file_name: string;
  file_url: string;
};

function isAllowedLink(value: string, formats: string[]) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    const allowYoutube =
      formats.includes("youtube") &&
      (host === "youtube.com" ||
        host === "www.youtube.com" ||
        host === "m.youtube.com" ||
        host === "youtu.be");
    const allowDrive =
      formats.includes("gdrive") && host === "drive.google.com";
    return allowYoutube || allowDrive;
  } catch {
    return false;
  }
}

/**
 * Validate uploaded/linked documents against the competition requirements for
 * one education stream. Returns field errors keyed like `documents.<id>`.
 */
export function validateDocumentsAgainstRequirements(
  documents: SubmittedDocument[],
  requirements: DocumentRequirement[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  const byRequirement = new Map(
    documents
      .filter((doc) => doc.requirement_id)
      .map((doc) => [doc.requirement_id!, doc])
  );

  for (const requirement of requirements) {
    const key = `documents.${requirement.id}`;
    const doc = byRequirement.get(requirement.id);
    const value = doc?.file_url?.trim() ?? "";

    if (!value) {
      if (requirement.required) {
        errors[key] =
          requirement.input_type === "LINK"
            ? `${requirement.name} is required.`
            : `Please upload your ${requirement.name.toLowerCase()}.`;
      }
      continue;
    }

    if (requirement.input_type === "LINK") {
      if (!isAllowedLink(value, requirement.accepted_formats)) {
        const labels = formatLabels(requirement.accepted_formats);
        errors[key] = `Enter a valid ${labels} link.`;
      }
      continue;
    }

    const fileName = doc?.file_name?.toLowerCase() ?? "";
    const allowed = requirement.accepted_formats.some((format) =>
      fileName.endsWith(`.${format.toLowerCase()}`)
    );
    if (!allowed) {
      errors[key] = `Upload a ${formatLabels(requirement.accepted_formats)} file.`;
    }
  }

  return errors;
}

/** True when every required document for the level is present and valid. */
export function documentsSatisfyRequirements(
  documents: SubmittedDocument[],
  requirements: DocumentRequirement[]
) {
  return (
    Object.keys(validateDocumentsAgainstRequirements(documents, requirements))
      .length === 0
  );
}

/**
 * Deadline lines for invitation / confirmation emails, keyed by unique document
 * name. Skips Abstract (covered by the registration window line).
 */
export function documentDeadlineLines(
  requirements: DocumentRequirement[],
  deadline: string
) {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const requirement of requirements) {
    if (requirement.name.trim().toLowerCase().includes("abstract")) continue;
    const key = `${requirement.name.trim().toLowerCase()}|${requirement.required}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const optional = requirement.required ? "" : " (optional)";
    lines.push(
      `${requirement.name.trim()} Submission Deadline${optional}: ${deadline}`
    );
  }
  return lines;
}

/** Short phrase listing unique document names for judge invite copy. */
export function documentReviewPhrase(requirements: DocumentRequirement[]) {
  const names = [
    ...new Set(
      requirements
        .map((requirement) => requirement.name.trim())
        .filter(Boolean)
    ),
  ];
  if (names.length === 0) {
    return "Review the assigned submissions.";
  }
  if (names.length === 1) {
    return `Review the assigned submissions (${names[0].toLowerCase()} where available).`;
  }
  const head = names.slice(0, -1).map((name) => name.toLowerCase());
  const last = names[names.length - 1].toLowerCase();
  return `Review the assigned submissions (${head.join(", ")}, and ${last} where available).`;
}
