import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { getArrears } from "@/lib/queries";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await getArrears();
    return json({ count: rows.length, families: rows });
  } catch (error) {
    return errorResponse(error);
  }
}
