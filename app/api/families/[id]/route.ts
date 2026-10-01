import { errorResponse, json, requireAdmin, requireSession, assertFamily } from "@/lib/guard";
import { deleteFamily, getFamilyBundle, updateFamily } from "@/lib/queries";
import { familyUpdateSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const session = await requireSession();
    assertFamily(session, id);
    return json(await getFamilyBundle(id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const parsed = familyUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid family." }, 400);
    const bundle = await updateFamily(id, {
      ...parsed.data,
      password: parsed.data.password || undefined,
      notes: parsed.data.notes || undefined,
    });
    return json(bundle);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    return json(await deleteFamily(id));
  } catch (error) {
    return errorResponse(error);
  }
}
