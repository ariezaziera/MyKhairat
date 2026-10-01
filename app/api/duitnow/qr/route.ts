import { NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/guard";
import { getDuitnowQr } from "@/lib/queries";

export async function GET() {
  try {
    await requireSession();
    const qr = await getDuitnowQr();
    if (!qr?.image || !qr.contentType) return NextResponse.json({ error: "No DuitNow QR has been uploaded." }, { status: 404 });
    return new NextResponse(Buffer.from(qr.image, "base64"), {
      headers: {
        "Content-Type": qr.contentType,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
