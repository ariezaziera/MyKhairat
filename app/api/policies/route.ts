import { z } from "zod";
import { json, errorResponse, requireAdmin, AppError } from "@/lib/guard";
import { getClient } from "@/lib/db";
import { write, auditWrite } from "@/lib/write";
import { malaysiaMonth } from "@/lib/dates";
const schema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  rate: z.number().positive(),
  dueDay: z.number().int().min(1).max(28),
  death: z.number().positive(),
  warded: z.number().positive(),
  note: z.string().trim().min(10).max(500),
});
export async function GET() {
  try {
    await requireAdmin();
    return json(
      (
        await getClient().execute(
          "SELECT * FROM contribution_policies ORDER BY effective_month DESC",
        )
      ).rows,
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin("settings"),
      p = schema.parse(await request.json());
    if (p.month >= malaysiaMonth())
      throw new AppError(
        "Gunakan Persetujuan untuk perubahan semasa atau masa depan.",
      );
    await write(async (tx) => {
      await tx.execute({
        sql: "INSERT INTO contribution_policies VALUES(?,?,?,?,?,?,?)",
        args: [
          p.month,
          p.rate,
          p.dueDay,
          p.death,
          p.warded,
          p.note,
          new Date().toISOString(),
        ],
      });
      await auditWrite(tx, actor, "Sahkan polisi sejarah", p);
    });
    return json({ ok: true }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
