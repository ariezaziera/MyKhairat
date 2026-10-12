import { randomUUID } from "crypto";
import { z } from "zod";
import { requireAdmin, json, errorResponse, AppError } from "@/lib/guard";
import { getClient } from "@/lib/db";
import { write, auditWrite } from "@/lib/write";
import { fundSummary } from "@/lib/finance";
import { todayDate } from "@/lib/format";
const schema = z.object({
  kind: z.enum([
    "Opening",
    "Donation",
    "Expense",
    "Adjustment",
    "Refund",
    "Reconcile",
  ]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (d) =>
        !Number.isNaN(new Date(d).getTime()) &&
        new Date(d).toISOString().slice(0, 10) === d,
    ),
  amount: z.number().finite().min(-10000000).max(10000000),
  reference: z.string().trim().min(3).max(100),
  note: z.string().trim().min(5).max(500),
});
export async function GET() {
  try {
    await requireAdmin();
    const [summary, entries, reconciliations] = await Promise.all([
      fundSummary(),
      getClient().execute(
        "SELECT * FROM fund_entries ORDER BY date DESC,created_at DESC LIMIT 500",
      ),
      getClient().execute(
        "SELECT * FROM bank_reconciliations ORDER BY date DESC LIMIT 100",
      ),
    ]);
    return json({
      summary,
      entries: entries.rows,
      reconciliations: reconciliations.rows,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin("settings"),
      p = schema.parse(await request.json());
    if (p.date > todayDate())
      throw new AppError("Tarikh bukan pada masa depan.");
    if (p.kind !== "Adjustment" && p.amount < 0)
      throw new AppError(
        "Masukkan nilai positif; sistem menentukan masuk atau keluar.",
      );
    const summary = await fundSummary(p.date);
    await write(async (tx) => {
      if (p.kind === "Reconcile")
        await tx.execute({
          sql: "INSERT INTO bank_reconciliations VALUES(?,?,?,?,?,?,?)",
          args: [
            randomUUID(),
            p.date,
            p.amount,
            summary.balance,
            p.note,
            actor.sub,
            new Date().toISOString(),
          ],
        });
      else {
        if (p.kind === "Opening") {
          const first = (
            await tx.execute(
              "SELECT MIN(d) AS first_date FROM (SELECT payment_date AS d FROM payments WHERE approval_status='Approved' UNION ALL SELECT COALESCE(paid_date,claim_date) AS d FROM claims WHERE status='Paid' UNION ALL SELECT date AS d FROM fund_entries)",
            )
          ).rows[0]?.first_date;
          if (first && p.date >= String(first))
            throw new AppError(
              "Baki asal mesti pada tarikh sebelum transaksi pertama yang termasuk dalam buku.",
            );
        }
        if (
          p.kind === "Opening" &&
          (await tx.execute("SELECT id FROM fund_entries WHERE kind='Opening'"))
            .rows.length
        )
          throw new AppError(
            "Baki bank asal sudah direkod. Gunakan pelarasan dengan alasan.",
            409,
          );
        await tx.execute({
          sql: "INSERT INTO fund_entries VALUES(?,?,?,?,?,?,?,?)",
          args: [
            randomUUID(),
            p.date,
            p.kind,
            ["Expense", "Refund"].includes(p.kind) ? -p.amount : p.amount,
            p.reference,
            p.note,
            actor.sub,
            new Date().toISOString(),
          ],
        });
      }
      await auditWrite(tx, actor, "Ledger dana", p);
    });
    return json({ ok: true }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
