import { NextResponse } from "next/server";
import { assertFamily, errorResponse, requireSession } from "@/lib/guard";
import { getReceipt } from "@/lib/queries";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const receipt = await getReceipt(id);
    assertFamily(session, receipt.familyId);
    return new NextResponse(Buffer.from(receipt.imageData, "base64"), {
      headers: {
        "Content-Type": receipt.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
