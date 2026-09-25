import { NextRequest } from "next/server";

import { CompetitionModel } from "@/models/Competition";
import {
  competitionInputSchema,
  competitionSchema,
} from "@/schemas/competitionSchema";
import { requireAdminSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeCompetition } from "@/utils/serializeCatalog";
import { uniqueSlug } from "@/utils/slug";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const competitions = await new CompetitionModel().find(
      {},
      { sort: { start_date: -1 } }
    );

    return createResponse({
      competitions: competitions.map(serializeCompetition),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = competitionInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    if (parsed.data.end_date < parsed.data.start_date) {
      return createResponse(
        { error: "End date must be on or after start date." },
        400
      );
    }

    const model = new CompetitionModel();
    const competition_id = await uniqueSlug(parsed.data.name, async (slug) => {
      const existing = await model.findOne({ competition_id: slug });
      return Boolean(existing);
    });

    const created = await model.create(
      competitionSchema.parse({
        ...parsed.data,
        competition_id,
      })
    );

    return createResponse(
      { competition: serializeCompetition(created) },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
