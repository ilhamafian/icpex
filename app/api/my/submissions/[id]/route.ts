import { NextRequest } from "next/server";

import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import {
  requirementsForLevel,
  requirementsForTiming,
} from "@/schemas/documentRequirement";
import { toIdString } from "@/schemas/objectId";
import { currencySchema, paymentUpdateSchema } from "@/schemas/paymentSchema";
import { registrationSchema } from "@/schemas/registrationSchema";
import {
  submissionFormSchema,
  submissionSchema,
} from "@/schemas/submissionSchema";
import { getParticipantSession } from "@/lib/participantSession";
import { createResponse, handleError } from "@/utils/apiHelper";
import { preparePublicSubmission } from "@/utils/preparePublicSubmission";
import { advanceRegistrationIfPaid } from "@/utils/submissionPayments";

const registrationUpdateSchema = registrationSchema.pick({
  participant: true,
  project: true,
  team: true,
  supervisors: true,
  documents: true,
  category_id: true,
  institution_key: true,
  fee: true,
});

const submissionDetailsSchema = submissionSchema.pick({
  institution: true,
});

const submissionRepriceSchema = submissionSchema.pick({
  institution: true,
  institution_key: true,
  amount: true,
  free_count: true,
  currency: true,
});

const paymentRepriceSchema = paymentUpdateSchema.extend({
  currency: currencySchema.optional(),
});

/** Participant edits their own submission until it is paid. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const participant = await getParticipantSession();
    if (!participant) {
      return createResponse({ error: "Sign in to edit this submission." }, 401);
    }

    const { id } = await params;
    const submissionModel = new SubmissionModel();
    const registrationModel = new RegistrationModel();
    const paymentModel = new PaymentModel();

    const submission = await submissionModel.findById(id);
    if (
      !submission ||
      toIdString(submission.participant_id) !== toIdString(participant._id)
    ) {
      return createResponse({ error: "Submission not found." }, 404);
    }

    const [registrations, payments] = await Promise.all([
      registrationModel.find({ submission_id: id }),
      paymentModel.find({ submission_id: id }),
    ]);
    const registration = registrations[0];
    if (!registration) {
      return createResponse({ error: "Submission not found." }, 404);
    }

    const paid =
      Boolean(submission.paid_at) || payments.some((payment) => payment.status === "PAID");
    if (paid) {
      return createResponse(
        { error: "This submission is paid and can no longer be edited." },
        403
      );
    }

    const body = await req.json();
    const parsed = submissionFormSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const registrationId = toIdString(registration._id);
    const prepared = await preparePublicSubmission(parsed.data, {
      excludeRegistrationId: registrationId,
    });
    if (!prepared.ok) {
      return createResponse({ error: prepared.error }, 400);
    }
    if (prepared.value.competitionId !== toIdString(submission.competition_id)) {
      return createResponse({ error: "This submission belongs to another competition." }, 400);
    }

    const project = prepared.value.projects[0];
    if (!project) {
      return createResponse({ error: "Add a project before saving." }, 400);
    }

    const reprice = payments.length === 0 || payments.every((payment) => payment.status === "REVIEW");
    const beforePaymentIds = new Set(
      requirementsForTiming(
        requirementsForLevel(
          prepared.value.documentRequirements,
          project.participant.education_level
        ),
        "BEFORE_PAYMENT"
      ).map((requirement) => requirement.id)
    );
    const keptDocuments = registration.documents.filter(
      (document) => !document.requirement_id || !beforePaymentIds.has(document.requirement_id)
    );
    const nextFee = reprice ? (prepared.value.quote.fees[0] ?? 0) : registration.fee;

    await registrationModel.update(
      registrationId,
      {
        participant: { ...project.participant, institution: prepared.value.institution },
        project: project.project,
        team: project.team,
        supervisors: project.supervisors,
        documents: [...project.documents, ...keptDocuments],
        category_id: String(project.category_id),
        ...(reprice
          ? { institution_key: prepared.value.institutionKey, fee: nextFee }
          : {}),
      },
      registrationUpdateSchema
    );

    if (reprice) {
      await submissionModel.update(
        id,
        {
          institution: prepared.value.institution,
          institution_key: prepared.value.institutionKey,
          amount: prepared.value.quote.total,
          free_count: prepared.value.quote.freeCount,
          currency: prepared.value.quote.currency,
        },
        submissionRepriceSchema
      );
      for (const payment of payments) {
        const status = nextFee === 0 ? "PAID" : "REVIEW";
        await paymentModel.update(
          toIdString(payment._id),
          {
            amount: nextFee,
            currency: prepared.value.quote.currency,
            status,
          },
          paymentRepriceSchema
        );
        await advanceRegistrationIfPaid(toIdString(payment.registration_id), status);
      }
    } else {
      await submissionModel.update(
        id,
        { institution: prepared.value.institution },
        submissionDetailsSchema
      );
    }

    return createResponse({
      submission: {
        submission_number: submission.submission_number,
        projects: [
          {
            registration_number: registration.registration_number,
            title: project.project.title,
          },
        ],
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
