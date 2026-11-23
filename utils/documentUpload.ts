import "server-only";

import { WithId } from "mongodb";

import { getAppOrigin } from "@/lib/appOrigin";
import {
  competitionEmailCopy,
  sendDocumentSubmissionReceivedEmail,
  sendDocumentUploadReminderEmail,
} from "@/lib/email";
import { createPaymentToken, hashPaymentToken } from "@/lib/paymentToken";
import { CategoryModel } from "@/models/Category";
import { CompetitionModel } from "@/models/Competition";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import {
  effectiveDocumentRequirements,
  storageTypeForRequirement,
  validateDocumentsAgainstRequirements,
} from "@/schemas/documentRequirement";
import { toIdString } from "@/schemas/objectId";
import {
  registrationDocumentLinkSchema,
  registrationDocumentsSchema,
  type Registration,
} from "@/schemas/registrationSchema";
import type { DocumentUploadPage } from "@/utils/documentUploadTypes";
import {
  afterPaymentRequirements,
  filesFor,
} from "@/utils/documentUploadState";

export type {
  DocumentUploadFile,
  DocumentUploadPage,
  DocumentUploadState,
} from "@/utils/documentUploadTypes";

function formatDeadline(value: Date | string | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Create the reusable upload link on first use and return its absolute URL. */
export async function ensureDocumentUploadUrl(
  registration: WithId<Registration>
) {
  let token = registration.document_upload_token;
  if (!token || !registration.document_upload_token_hash) {
    const created = createPaymentToken();
    token = created.token;
    await new RegistrationModel().update(
      toIdString(registration._id),
      {
        document_upload_token: created.token,
        document_upload_token_hash: created.tokenHash,
      },
      registrationDocumentLinkSchema
    );
  }
  const origin = await getAppOrigin();
  return `${origin}/upload/${encodeURIComponent(token)}`;
}

type UploadJob = {
  send: () => Promise<void>;
};

async function uploadJobsForSubmission(submissionId: string): Promise<UploadJob[]> {
  const submission = await new SubmissionModel().findById(submissionId);
  if (!submission) return [];

  const [registrations, competition] = await Promise.all([
    new RegistrationModel().find({ submission_id: submissionId }),
    new CompetitionModel().findById(toIdString(submission.competition_id)),
  ]);
  const copy = competitionEmailCopy(competition ?? { name: "ICPEX" });
  const requirements = effectiveDocumentRequirements(competition);
  const categoryModel = new CategoryModel();
  const jobs: UploadJob[] = [];

  for (const registration of registrations) {
    if (registration.documents_submitted_at) continue;
    const after = afterPaymentRequirements(
      requirements,
      registration.participant.education_level
    );
    if (after.length === 0) continue;
    const to = registration.participant.email.trim().toLowerCase();
    if (!to) continue;
    const uploadUrl = await ensureDocumentUploadUrl(registration);
    const category = await categoryModel.findById(
      toIdString(registration.category_id)
    );
    jobs.push({
      send: () =>
        sendDocumentUploadReminderEmail({
          to,
          participantName: registration.participant.name,
          registrationNumber: registration.registration_number,
          trackName: category?.name ?? "",
          projectTitle: registration.project.title,
          educationLevel: registration.participant.education_level,
          uploadUrl,
          requirements: after,
          copy,
        }),
    });
  }

  return jobs;
}

/** Email one upload link per project that still owes after-payment documents. */
export async function sendAfterPaymentDocumentEmails(submissionId: string) {
  const jobs = await uploadJobsForSubmission(submissionId);
  const results = await Promise.allSettled(jobs.map((job) => job.send()));
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Document upload email failed:", result.reason);
    }
  }
  const failed = results.filter((result) => result.status === "rejected").length;
  return { sent: jobs.length - failed, failed, total: jobs.length };
}

export async function loadDocumentUploadPage(
  token: string
): Promise<DocumentUploadPage | null> {
  const registration = await new RegistrationModel().findByDocumentUploadTokenHash(
    hashPaymentToken(token)
  );
  if (!registration) return null;

  const [competition, category] = await Promise.all([
    new CompetitionModel().findById(toIdString(registration.competition_id)),
    new CategoryModel().findById(toIdString(registration.category_id)),
  ]);
  const after = afterPaymentRequirements(
    effectiveDocumentRequirements(competition),
    registration.participant.education_level
  );
  if (after.length === 0) return null;

  return {
    registrationNumber: registration.registration_number,
    participantName: registration.participant.name,
    trackName: category?.name ?? "",
    projectTitle: registration.project.title,
    deadline: formatDeadline(competition?.payment_deadline),
    submitted: Boolean(registration.documents_submitted_at),
    requirements: filesFor(registration.documents, after),
  };
}

export type IncomingDocument = {
  requirement_id: string;
  file_name: string;
  file_url: string;
};

/**
 * Append after-payment documents and lock the link.
 * Returns an error message, or null when the submission was stored.
 */
export async function submitAfterPaymentDocuments(
  token: string,
  incoming: IncomingDocument[]
): Promise<{ error: string; status: number } | { ok: true }> {
  const model = new RegistrationModel();
  const registration = await model.findByDocumentUploadTokenHash(
    hashPaymentToken(token)
  );
  if (!registration) {
    return { error: "This upload link is invalid.", status: 404 };
  }
  if (registration.documents_submitted_at) {
    return {
      error: "These documents have already been submitted. Contact the secretariat to replace a file.",
      status: 409,
    };
  }

  const [competition, category] = await Promise.all([
    new CompetitionModel().findById(toIdString(registration.competition_id)),
    new CategoryModel().findById(toIdString(registration.category_id)),
  ]);
  const after = afterPaymentRequirements(
    effectiveDocumentRequirements(competition),
    registration.participant.education_level
  );
  if (after.length === 0) {
    return { error: "This upload link is invalid.", status: 404 };
  }

  const allowed = new Set(after.map((requirement) => requirement.id));
  const submitted = incoming.filter((document) =>
    allowed.has(document.requirement_id)
  );
  const byRequirement = new Map(
    after.map((requirement) => [requirement.id, requirement])
  );
  const documents = submitted.flatMap((document) => {
    const requirement = byRequirement.get(document.requirement_id);
    if (!requirement) return [];
    return [
      {
        type: storageTypeForRequirement(requirement),
        requirement_id: requirement.id,
        label: requirement.name,
        file_name: document.file_name.trim(),
        file_url: document.file_url.trim(),
      },
    ];
  });
  const errors = validateDocumentsAgainstRequirements(documents, after);
  const firstError = Object.values(errors)[0];
  if (firstError) return { error: firstError, status: 400 };

  const incomingIds = new Set(
    documents.flatMap((document) =>
      document.requirement_id ? [document.requirement_id] : []
    )
  );
  const kept = registration.documents.filter(
    (document) =>
      !document.requirement_id || !incomingIds.has(document.requirement_id)
  );
  const receivedAt = new Date();
  await model.update(
    toIdString(registration._id),
    {
      documents: [...kept, ...documents],
      documents_submitted_at: receivedAt,
    },
    registrationDocumentsSchema
  );

  const copy = competitionEmailCopy(competition ?? { name: "ICPEX" });
  try {
    await sendDocumentSubmissionReceivedEmail({
      to: registration.participant.email.trim().toLowerCase(),
      participantName: registration.participant.name,
      registrationNumber: registration.registration_number,
      trackName: category?.name ?? "",
      projectTitle: registration.project.title,
      educationLevel: registration.participant.education_level,
      requirements: after,
      receivedIds: documents.flatMap((document) =>
        document.requirement_id ? [document.requirement_id] : []
      ),
      receivedAt,
      copy,
    });
  } catch (error) {
    console.error("Document submission email failed:", error);
  }

  return { ok: true };
}

/** Secretariat replaces one after-payment document after the participant has submitted. */
export async function replaceAfterPaymentDocument(
  registrationId: string,
  incoming: IncomingDocument
): Promise<{ error: string; status: number } | { ok: true }> {
  const model = new RegistrationModel();
  const registration = await model.findById(registrationId);
  if (!registration) return { error: "Registration not found", status: 404 };
  if (!registration.documents_submitted_at) {
    return {
      error: "The participant has not submitted these documents yet.",
      status: 400,
    };
  }

  const competition = await new CompetitionModel().findById(
    toIdString(registration.competition_id)
  );
  const after = afterPaymentRequirements(
    effectiveDocumentRequirements(competition),
    registration.participant.education_level
  );
  const requirement = after.find(
    (item) => item.id === incoming.requirement_id
  );
  if (!requirement) {
    return { error: "That document is not collected after payment.", status: 400 };
  }

  const document = {
    type: storageTypeForRequirement(requirement),
    requirement_id: requirement.id,
    label: requirement.name,
    file_name: incoming.file_name.trim(),
    file_url: incoming.file_url.trim(),
  };
  const errors = validateDocumentsAgainstRequirements([document], [
    { ...requirement, required: true },
  ]);
  const firstError = Object.values(errors)[0];
  if (firstError) return { error: firstError, status: 400 };

  const kept = registration.documents.filter(
    (item) => item.requirement_id !== requirement.id
  );
  await model.update(
    registrationId,
    { documents: [...kept, document] },
    registrationDocumentsSchema
  );
  return { ok: true };
}
