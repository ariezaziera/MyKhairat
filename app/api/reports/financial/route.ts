import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { getFinancialReport } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const year = Number(new URL(request.url).searchParams.get("year") || new Date().getFullYear());
    if (!Number.isInteger(year)) return json({ error: "Invalid year." }, 400);
    return json(await getFinancialReport(year));
  } catch (error) {
    return errorResponse(error);
  }
}
