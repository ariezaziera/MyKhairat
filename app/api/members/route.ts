import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { createMember } from "@/lib/queries";
import { memberSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const parsed = memberSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid member." }, 400);
    const memberId = await createMember({ ...parsed.data, icNumber: parsed.data.icNumber || undefined });
    return json({ memberId }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
