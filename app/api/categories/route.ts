import { NextRequest } from "next/server";

import { CategoryModel } from "@/models/Category";
import {
  categoryInputSchema,
  categorySchema,
} from "@/schemas/categorySchema";
import { requireAdminSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeCategory } from "@/utils/serializeCatalog";
import { uniqueSlug } from "@/utils/slug";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const categories = await new CategoryModel().find(
      {},
      { sort: { name: 1 } }
    );

    return createResponse({
      categories: categories.map(serializeCategory),
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
    const parsed = categoryInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const model = new CategoryModel();
    const category_id = await uniqueSlug(parsed.data.name, async (slug) => {
      const existing = await model.findOne({ category_id: slug });
      return Boolean(existing);
    });

    const created = await model.create(
      categorySchema.parse({
        ...parsed.data,
        category_id,
      })
    );

    return createResponse({ category: serializeCategory(created) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
