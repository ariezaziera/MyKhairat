import { z } from "zod";
import { requireAdmin, json, errorResponse, AppError } from "@/lib/guard";
import { write, auditWrite } from "@/lib/write";
import { todayDate } from "@/lib/format";
import { memberEffectiveMonth } from "@/lib/finance";
const schema = z.object({
  status: z.enum(["Reviewed", "Approved", "Paid", "Rejected"]),
  note: z.string().trim().min(5).max(500),
  paidDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  reference: z.string().trim().max(100).optional(),
  receiptId: z.string().optional(),
});
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin("claims"),
      { id } = await params,
      p = schema.parse(await request.json());
    return json(
      await write(async (tx) => {
        const c = (
          await tx.execute({
            sql: "SELECT * FROM claims WHERE claim_id=?",
            args: [id],
          })
        ).rows[0];
        if (!c) throw new AppError("Tuntutan tidak ditemui.", 404);
        const transitions: Record<string, string[]> = {
          Submitted: ["Reviewed", "Rejected"],
          Reviewed: ["Approved", "Rejected"],
          Approved: ["Paid", "Rejected"],
        };
        if (!transitions[String(c.status)]?.includes(p.status))
          throw new AppError(
            "Status sudah berubah atau tindakan tidak sesuai.",
            409,
          );
        if (p.status === "Paid") {
          if (
            !p.paidDate ||
            p.paidDate > todayDate() ||
            p.paidDate < String(c.claim_date) ||
            !p.reference ||
            !p.receiptId
          )
            throw new AppError(
              "Tarikh bayaran, rujukan dan bukti pembayaran diperlukan.",
            );
          if (
            (
              await tx.execute({
                sql: "SELECT claim_id FROM claims WHERE payout_reference=? AND status='Paid'",
                args: [p.reference],
              })
            ).rows.length
          )
            throw new AppError("Rujukan payout telah digunakan.", 409);
          const receipt = (
            await tx.execute({
              sql: "SELECT receipt_id FROM receipts WHERE receipt_id=? AND family_id=?",
              args: [p.receiptId, c.family_id],
            })
          ).rows[0];
          if (!receipt) throw new AppError("Bukti bayaran tidak sah.");
        }
        await tx.execute({
          sql: "UPDATE claims SET status=?,reviewed_by=?,reviewed_at=?,paid_date=?,payout_reference=?,notes=COALESCE(notes,'')||? WHERE claim_id=? AND status=?",
          args: [
            p.status,
            actor.name,
            new Date().toISOString(),
            p.paidDate || null,
            p.reference || null,
            "\n" +
              p.note +
              (p.receiptId
                ? " | Bukti payout /api/receipts/" + p.receiptId
                : ""),
            id,
            c.status,
          ],
        });
        if (c.claim_type === "Death" && p.status === "Approved")
          await tx.execute({
            sql: "UPDATE members SET member_status='Tidak Aktif',billing_start_month=COALESCE(billing_start_month,?),billing_end_month=? WHERE member_id=?",
            args: [
              String(c.claim_date).slice(0, 7),
              memberEffectiveMonth(),
              c.member_id,
            ],
          });
        await auditWrite(tx, actor, "Aliran tuntutan", {
          id,
          before: c.status,
          after: p.status,
          note: p.note,
          reference: p.reference,
        });
        return { ok: true };
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
