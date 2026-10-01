import { assertFamily, errorResponse, json, requireAdmin, requireSession } from "@/lib/guard";
import { createPayment, listPayments } from "@/lib/queries";
import { paymentSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const params = new URL(request.url).searchParams;
    const status = params.get("status") ?? undefined;
    const requestedFamily = params.get("familyId") ?? undefined;
    if (session.role === "wakil") {
      return json(await listPayments({ familyId: session.familyId ?? undefined, status }));
    }
    await requireAdmin();
    return json(await listPayments({ familyId: requestedFamily, status }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid payment." }, 400);
    assertFamily(session, parsed.data.familyId);
    const payment = await createPayment(parsed.data, session);
    return json(payment, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
