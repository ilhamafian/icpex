import type { DocumentRequirement } from "@/schemas/documentRequirement";

export type DocumentUploadFile = {
  requirementId: string;
  label: string;
  required: boolean;
  inputType: DocumentRequirement["input_type"];
  acceptedFormats: string[];
  fileName?: string;
  fileUrl?: string;
};

/** After-payment documents for one project, for the payments screen. */
export type DocumentUploadState = {
  /** True until the participant submits. */
  open: boolean;
  submittedAt?: string;
  files: DocumentUploadFile[];
};

export type DocumentUploadPage = {
  registrationNumber: string;
  participantName: string;
  trackName: string;
  projectTitle: string;
  deadline: string;
  submitted: boolean;
  requirements: DocumentUploadFile[];
};
