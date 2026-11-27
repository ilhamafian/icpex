import { NextRequest } from "next/server";

import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import { toIdString } from "@/schemas/objectId";
import { paymentSchema } from "@/schemas/paymentSchema";
import { registrationSchema } from "@/schemas/registrationSchema";
import {
  submissionFormSchema,
  submissionSchema,
} from "@/schemas/submissionSchema";
import {
  competitionEmailCopy,
  sendRegistrationSubmittedEmail,
} from "@/lib/email";
import { createResponse, handleError } from "@/utils/apiHelper";
import { preparePublicSubmission } from "@/utils/preparePublicSubmission";
import { advanceRegistrationIfPaid } from "@/utils/submissionPayments";

/** Public: register one project from one university. Payment is requested later by email. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submissionFormSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const prepared = await preparePublicSubmission(parsed.data);
    if (!prepared.ok) {
      return createResponse({ error: prepared.error }, 400);
    }
    const {
      competition,
      competitionId,
      institution,
      institutionKey,
      projects,
      categoryNameById,
      documentRequirements,
      quote,
    } = prepared.value;

    const submissionModel = new SubmissionModel();
    const registrationModel = new RegistrationModel();
    const paymentModel = new PaymentModel();
    const created = {
      submissionId: null as string | null,
      registrationIds: [] as string[],
      paymentIds: [] as string[],
    };

    try {
      const submission = await submissionModel.create(
        submissionSchema.parse({
          submission_number: await submissionModel.nextSubmissionNumber(),
          competition_id: competitionId,
          institution,
          institution_key: institutionKey,
          registration_ids: [],
          project_count: projects.length,
          free_count: quote.freeCount,
          amount: quote.total,
          currency: quote.currency,
        })
      );
      const submissionId = toIdString(submission._id);
      created.submissionId = submissionId;

      const results: {
        _id: string;
        registration_number: string;
        title: string;
        fee: number;
      }[] = [];
      for (const [index, project] of projects.entries()) {
        const fee = quote.fees[index];
        const registration = await registrationModel.create(
          registrationSchema.parse({
            ...project,
            participant: { ...project.participant, institution },
            competition_id: competitionId,
            category_id: String(project.category_id),
            registration_number: await registrationModel.nextRegistrationNumber(
              categoryNameById.get(String(project.category_id)) ?? ""
            ),
            submission_id: submissionId,
            institution_key: institutionKey,
            fee,
            status: "SUBMITTED",
          })
        );
        const registrationId = toIdString(registration._id);
        created.registrationIds.push(registrationId);

        const payment = await paymentModel.create(
          paymentSchema.parse({
            registration_id: registrationId,
            submission_id: submissionId,
            amount: fee,
            currency: quote.currency,
            status: quote.total === 0 ? "PAID" : "REVIEW",
          })
        );
        created.paymentIds.push(toIdString(payment._id));
        if (quote.total === 0) {
          await advanceRegistrationIfPaid(registrationId, "PAID");
        }

        results.push({
          _id: registrationId,
          registration_number: registration.registration_number,
          title: registration.project.title,
          fee,
        });
      }

      await submissionModel.update(
        submissionId,
        { registration_ids: created.registrationIds },
        submissionSchema.pick({ registration_ids: true })
      );

      const copy = competitionEmailCopy(competition);
      try {
        await Promise.all(
          projects.map((project, index) =>
            sendRegistrationSubmittedEmail({
              to: project.participant.email.trim().toLowerCase(),
              participantName: project.participant.name,
              registrationNumber: results[index].registration_number,
              institutionName: institution.name,
              educationLevel: project.participant.education_level,
              trackName: categoryNameById.get(String(project.category_id)) ?? "",
              projectTitle: project.project.title,
              paymentDue: results[index].fee > 0,
              copy,
              documentRequirements,
            })
          )
        );
      } catch (emailError) {
        console.error("Registration acknowledgement failed:", emailError);
      }

      return createResponse(
        {
          submission: {
            _id: submissionId,
            submission_number: submission.submission_number,
            total: quote.total,
            currency: quote.currency,
            free_count: quote.freeCount,
            projects: results,
          },
        },
        201
      );
    } catch (error) {
      await Promise.allSettled([
        ...created.paymentIds.map((id) => paymentModel.delete(id)),
        ...created.registrationIds.map((id) => registrationModel.delete(id)),
        ...(created.submissionId
          ? [submissionModel.delete(created.submissionId)]
          : []),
      ]);
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
}
