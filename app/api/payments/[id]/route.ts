import { assertFamily, errorResponse, json, requireSession } from "@/lib/guard";
import { deletePayment, getPayment } from "@/lib/queries";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const payment = await getPayment(id);
    assertFamily(session, payment.familyId);
    return json(payment);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const payment = await getPayment(id);
    assertFamily(session, payment.familyId);
    return json(await deletePayment(id));
  } catch (error) {
    return errorResponse(error);
  }
}
