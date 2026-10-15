import { NextRequest } from "next/server";

import { CategoryModel } from "@/models/Category";
import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import {
  EDUCATION_LEVEL_LABELS,
  allowedEducationLevels,
} from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import { paymentSchema } from "@/schemas/paymentSchema";
import { registrationSchema } from "@/schemas/registrationSchema";
import {
  submissionFormSchema,
  submissionSchema,
} from "@/schemas/submissionSchema";
import { sendRegistrationSubmittedEmail } from "@/lib/email";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { normalizeInstitution, quoteSubmission } from "@/utils/pricing";
import { advanceRegistrationIfPaid } from "@/utils/submissionPayments";

/** Public: register 1–6 projects from one university. Payment is requested later by email. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submissionFormSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }
    const { institution, projects } = parsed.data;

    const competition = await getCurrentCompetition();
    const competitionId = String(parsed.data.competition_id);
    if (!competition || toIdString(competition._id) !== competitionId) {
      return createResponse(
        { error: "No published competition available for registration." },
        400
      );
    }

    const allowedLevels = allowedEducationLevels(competition.eligibility);
    const categories = await new CategoryModel().find({});
    const categoryIds = new Set(categories.map((c) => toIdString(c._id)));

    for (const [index, project] of projects.entries()) {
      if (!allowedLevels.includes(project.participant.education_level)) {
        return createResponse(
          {
            error: `Project ${index + 1}: this competition is open to ${allowedLevels
              .map((level) => EDUCATION_LEVEL_LABELS[level].toLowerCase())
              .join(" and ")} participants only.`,
          },
          400
        );
      }
      if (!categoryIds.has(String(project.category_id))) {
        return createResponse(
          { error: `Project ${index + 1}: invalid category.` },
          400
        );
      }
    }

    const institutionKey = normalizeInstitution(institution.name);
    if (!institutionKey) {
      return createResponse({ error: "University name is required." }, 400);
    }

    const quote = await quoteSubmission(
      competitionId,
      institution,
      projects.length
    );

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

      const results = [];
      for (const [index, project] of projects.entries()) {
        const fee = quote.fees[index];
        const registration = await registrationModel.create(
          registrationSchema.parse({
            ...project,
            participant: { ...project.participant, institution },
            competition_id: competitionId,
            category_id: String(project.category_id),
            registration_number: await registrationModel.nextRegistrationNumber(),
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

      const recipients = [
        ...new Set(
          projects.map((project) => project.participant.email.trim().toLowerCase())
        ),
      ];
      try {
        await Promise.all(
          recipients.map((to) =>
            sendRegistrationSubmittedEmail({
              to,
              submissionNumber: submission.submission_number,
              institutionName: institution.name,
              projectCount: projects.length,
              paymentDue: quote.total > 0,
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
