import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { approvePayment, recordActivity } from "@/lib/queries";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const result = await approvePayment(id, session.name);
    await recordActivity(session, "Payment", `Approved ${result.payment.familyId} ${result.payment.paymentMonthYear} (${result.payment.transactionReference}).`);
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
