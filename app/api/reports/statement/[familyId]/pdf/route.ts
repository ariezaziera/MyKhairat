import { assertFamily, errorResponse, requireSession } from "@/lib/guard";
import { pdfResponse, statementPdf } from "@/lib/pdf";
import { getStatement } from "@/lib/queries";

type Context = { params: Promise<{ familyId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { familyId } = await context.params;
    assertFamily(session, familyId);
    const year = Number(new URL(request.url).searchParams.get("year") || new Date().getFullYear());
    const statement = await getStatement(familyId, year);
    const bytes = await statementPdf(statement);
    return pdfResponse(bytes, `mykhairat-statement-${familyId}-${year}.pdf`);
  } catch (error) {
    return errorResponse(error);
  }
}
