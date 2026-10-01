import { assertFamily, errorResponse, json, requireSession } from "@/lib/guard";
import { getStatement } from "@/lib/queries";

type Context = { params: Promise<{ familyId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { familyId } = await context.params;
    assertFamily(session, familyId);
    const year = Number(new URL(request.url).searchParams.get("year") || new Date().getFullYear());
    const statement = await getStatement(familyId, year);
    return json({
      family: statement.family,
      assessment: statement.assessment,
      year: statement.year,
      rows: statement.rows,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
