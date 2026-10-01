import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { deleteMember, updateMember } from "@/lib/queries";
import { memberSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const parsed = memberSchema.omit({ familyId: true }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid member." }, 400);
    const familyId = await updateMember(id, { ...parsed.data, icNumber: parsed.data.icNumber || undefined });
    return json({ familyId });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    return json({ familyId: await deleteMember(id) });
  } catch (error) {
    return errorResponse(error);
  }
}
