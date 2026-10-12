import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { rejectPayment } from "@/lib/queries";
import { rejectSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const session = await requireAdmin("approve");
    const { id } = await context.params;
    const parsed = rejectSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return json(
        { error: parsed.error.issues[0]?.message ?? "A reason is required." },
        400,
      );
    const result = await rejectPayment(
      id,
      session.name,
      parsed.data.reason,
      session,
    );
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
