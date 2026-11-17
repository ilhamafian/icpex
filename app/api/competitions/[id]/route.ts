import { NextRequest } from "next/server";

import { CompetitionModel } from "@/models/Competition";
import {
  competitionUpdateSchema,
  missingStreamNameError,
  type Competition,
} from "@/schemas/competitionSchema";
import { requireSuperAdminSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeCompetition } from "@/utils/serializeCatalog";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const model = new CompetitionModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Competition not found" }, 404);
    }

    const body = await req.json();
    const parsed = competitionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const nextStart = parsed.data.start_date ?? existing.start_date;
    const nextEnd = parsed.data.end_date ?? existing.end_date;
    if (nextEnd < nextStart) {
      return createResponse(
        { error: "End date must be on or after start date." },
        400
      );
    }

    const streamError = missingStreamNameError({
      eligibility: parsed.data.eligibility ?? existing.eligibility,
      undergraduate_stream_name:
        parsed.data.undergraduate_stream_name ??
        existing.undergraduate_stream_name,
      postgraduate_stream_name:
        parsed.data.postgraduate_stream_name ??
        existing.postgraduate_stream_name,
    });
    if (streamError) {
      return createResponse({ error: streamError }, 400);
    }

    await model.update(
      id,
      parsed.data as Partial<Competition>,
      competitionUpdateSchema
    );

    const updated = await model.findById(id);
    if (!updated) {
      return createResponse({ error: "Competition not found" }, 404);
    }

    return createResponse({ competition: serializeCompetition(updated) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const model = new CompetitionModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Competition not found" }, 404);
    }

    await model.delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
