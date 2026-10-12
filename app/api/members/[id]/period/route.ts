import { z } from "zod";
import { requireAdmin, json, errorResponse, AppError } from "@/lib/guard";
import { write, auditWrite } from "@/lib/write";
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const schema = z.object({
  start: month,
  end: z.union([month, z.literal("")]).optional(),
  note: z.string().trim().min(10).max(500),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin("settings"),
      { id } = await params,
      p = schema.parse(await request.json());
    await write(async (tx) => {
      const member = (
        await tx.execute({
          sql: "SELECT m.*,f.joined_month FROM members m JOIN families f ON f.family_id=m.family_id WHERE m.member_id=?",
          args: [id],
        })
      ).rows[0];
      if (!member) throw new AppError("Ahli tidak ditemui.", 404);
      if (p.start < String(member.joined_month) || (p.end && p.end < p.start))
        throw new AppError("Semak bulan mula dan bulan berhenti.");
      await tx.execute({
        sql: "UPDATE members SET billing_start_month=?,billing_end_month=? WHERE member_id=?",
        args: [p.start, p.end || null, id],
      });
      await auditWrite(tx, actor, "Sahkan tempoh ahli", {
        memberId: id,
        start: p.start,
        end: p.end,
        note: p.note,
      });
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
