import { NextRequest } from "next/server";

import { CategoryModel } from "@/models/Category";
import {
  categoryUpdateSchema,
  type Category,
} from "@/schemas/categorySchema";
import { requireAdminSession } from "@/utils/adminAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeCategory } from "@/utils/serializeCatalog";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const model = new CategoryModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Category not found" }, 404);
    }

    const body = await req.json();
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await model.update(
      id,
      parsed.data as Partial<Category>,
      categoryUpdateSchema
    );

    const updated = await model.findById(id);
    if (!updated) {
      return createResponse({ error: "Category not found" }, 404);
    }

    return createResponse({ category: serializeCategory(updated) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const model = new CategoryModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Category not found" }, 404);
    }

    await model.delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
