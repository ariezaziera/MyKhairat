import { errorResponse, requireAdmin } from "@/lib/guard";
import { financialPdf, pdfResponse } from "@/lib/pdf";
import { getFinancialReport } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const year = Number(new URL(request.url).searchParams.get("year") || new Date().getFullYear());
    const report = await getFinancialReport(year);
    const bytes = await financialPdf(report);
    return pdfResponse(bytes, `mykhairat-financial-${year}.pdf`);
  } catch (error) {
    return errorResponse(error);
  }
}
