import { NextRequest } from "next/server";

import { CategoryModel } from "@/models/Category";
import { CompetitionModel } from "@/models/Competition";
import { RegistrationModel } from "@/models/Registration";
import {
  registrationFormSchema,
  registrationSchema,
} from "@/schemas/registrationSchema";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registrationFormSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const competitionId = String(parsed.data.competition_id);
    const categoryId = String(parsed.data.category_id);

    const competition = await new CompetitionModel().findById(competitionId);
    if (!competition || competition.status !== "PUBLISHED") {
      return createResponse(
        { error: "No published competition available for registration." },
        400
      );
    }

    const category = await new CategoryModel().findById(categoryId);
    if (!category) {
      return createResponse({ error: "Invalid category." }, 400);
    }

    const model = new RegistrationModel();
    const registration_number = await model.nextRegistrationNumber();

    const created = await model.create(
      registrationSchema.parse({
        ...parsed.data,
        competition_id: competitionId,
        category_id: categoryId,
        registration_number,
        status: "SUBMITTED",
      })
    );

    return createResponse(
      {
        registration: {
          _id: toIdString(created._id),
          registration_number: created.registration_number,
          status: created.status,
        },
      },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
