import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { recordActivity, recordManualPayment } from "@/lib/queries";
import { manualPaymentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const parsed = manualPaymentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid payment." }, 400);
    const payment = await recordManualPayment(
      {
        ...parsed.data,
        entryNote: parsed.data.entryNote || undefined,
      },
      session,
    );
    await recordActivity(
      session,
      "Manual payment",
      `${parsed.data.markApproved ? "Recorded and approved" : "Recorded"} ${parsed.data.amountPaid} for ${parsed.data.familyId} ${parsed.data.paymentMonthYear}.`,
    );
    return json(payment, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
