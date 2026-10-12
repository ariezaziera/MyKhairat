import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { recordManualPayment } from "@/lib/queries";
import { manualPaymentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin("payments");
    const parsed = manualPaymentSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payment." },
        400,
      );
    const payment = await recordManualPayment(
      {
        ...parsed.data,
        entryNote: parsed.data.entryNote || undefined,
        receiptId: parsed.data.receiptId,
      },
      session,
    );
    return json(payment, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
