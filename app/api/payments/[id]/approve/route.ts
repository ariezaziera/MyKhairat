import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { approvePayment } from "@/lib/queries";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const session = await requireAdmin("approve");
    const { id } = await context.params;
    const result = await approvePayment(id, session.name, session);
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
