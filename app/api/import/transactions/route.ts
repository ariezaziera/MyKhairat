import ExcelJS from "exceljs";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireAdmin, json, errorResponse, AppError } from "@/lib/guard";
import { write, auditWrite } from "@/lib/write";
import { getClient } from "@/lib/db";
import { todayDate } from "@/lib/format";
import { ensureAssessments } from "@/lib/finance";
const rowSchema = z.object({
  familyId: z.string().trim().min(2),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (d) =>
        !Number.isNaN(new Date(d).getTime()) &&
        new Date(d).toISOString().slice(0, 10) === d &&
        d <= todayDate(),
    ),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  amount: z.number().positive().max(1000000),
  reference: z.string().trim().min(2).max(64),
  expected: z.number().min(0).max(100000).optional(),
  count: z.number().int().min(0).max(1000).optional(),
});
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin("settings");
    const content = request.headers.get("content-type") || "";
    if (content.includes("multipart/form-data")) {
      const form = await request.formData(),
        file = form.get("file");
      if (!(file instanceof File) || !file.size || file.size > 3_000_000)
        throw new AppError("Pilih .xlsx/CSV bawah 3MB.");
      const book = new ExcelJS.Workbook(),
        buffer = Buffer.from(await file.arrayBuffer());
      if (file.name.toLowerCase().endsWith(".xlsx"))
        await book.xlsx.load(
          buffer as unknown as Parameters<typeof book.xlsx.load>[0],
        );
      else if (file.name.toLowerCase().endsWith(".csv"))
        await book.csv.read(Readable.from(buffer));
      else throw new AppError("Gunakan .xlsx atau CSV.");
      const sheet = book.worksheets[0];
      if (!sheet || sheet.rowCount > 501)
        throw new AppError("Maksimum500 baris setiap import.");
      const heads = Array.from({ length: sheet.columnCount }, (_, i) =>
        sheet
          .getRow(1)
          .getCell(i + 1)
          .text.toLowerCase()
          .replace(/[^a-z0-9]/g, ""),
      );
      const index = (names: string[]) =>
        heads.findIndex((h) => names.includes(h));
      const fields = {
        familyId: index(["familyid", "idkeluarga"]),
        date: index(["date", "tarikh", "paymentdate"]),
        month: index(["month", "bulan", "paymentmonth"]),
        amount: index(["amount", "jumlah", "amountpaid"]),
        reference: index(["reference", "rujukan", "transactionreference"]),
        expected: index(["expected", "carumansebenar"]),
        count: index(["count", "bilanganahli"]),
      };
      if (
        Object.entries(fields).some(
          ([k, v]) => !["expected", "count"].includes(k) && v < 0,
        )
      )
        throw new AppError(
          "Kolum wajib: Family ID, Tarikh, Bulan, Jumlah, Rujukan.",
        );
      const rows: unknown[] = [];
      const errors: string[] = [];
      sheet.eachRow((row, n) => {
        if (n === 1) return;
        const get = (i: number) =>
          i < 0 ? "" : row.getCell(i + 1).text.trim();
        const raw = {
          familyId: get(fields.familyId),
          date:
            fields.date >= 0 &&
            row.getCell(fields.date + 1).value instanceof Date
              ? (row.getCell(fields.date + 1).value as Date)
                  .toISOString()
                  .slice(0, 10)
              : get(fields.date),
          month:
            fields.month >= 0 &&
            row.getCell(fields.month + 1).value instanceof Date
              ? (row.getCell(fields.month + 1).value as Date)
                  .toISOString()
                  .slice(0, 7)
              : get(fields.month),
          amount: Number(get(fields.amount)),
          reference: get(fields.reference),
          expected: get(fields.expected)
            ? Number(get(fields.expected))
            : undefined,
          count: get(fields.count) ? Number(get(fields.count)) : undefined,
        };
        const p = rowSchema.safeParse(raw);
        if (p.success) rows.push(p.data);
        else
          errors.push(
            "Baris " +
              n +
              ": semak ID, format tarikh YYYY-MM-DD / bulan YYYY-MM, jumlah dan rujukan.",
          );
      });
      return json({
        rows,
        errors,
        total: rows.reduce<number>(
          (n, r) => n + (r as { amount: number }).amount,
          0,
        ),
      });
    }
    const input = z
      .object({
        rows: z.array(rowSchema).min(1).max(500),
        confirm: z.literal(true),
        note: z.string().trim().min(10).max(500),
      })
      .parse(await request.json());
    for (const familyId of new Set(input.rows.map((r) => r.familyId))) {
      const f = (
        await getClient().execute({
          sql: "SELECT family_id FROM families WHERE family_id=?",
          args: [familyId],
        })
      ).rows[0];
      if (!f) throw new AppError("ID keluarga " + familyId + " tidak ditemui.");
      await ensureAssessments(familyId);
    }
    const total = input.rows.reduce((n, r) => n + r.amount, 0);
    await write(async (tx) => {
      const opening = (
        await tx.execute("SELECT date FROM fund_entries WHERE kind='Opening'")
      ).rows[0];
      for (const row of input.rows) {
        if (opening && row.date <= String(opening.date))
          throw new AppError(
            "Transaksi batch termasuk dalam baki bank asal. Semak cutover.",
          );
        if (row.date.slice(0, 7) < row.month)
          throw new AppError(
            "Tarikh bayaran sebelum bulan caruman. Semak rekod.",
          );
        const month = (
          await tx.execute({
            sql: "SELECT * FROM monthly_assessments WHERE family_id=? AND month=?",
            args: [row.familyId, row.month],
          })
        ).rows[0];
        if (!month)
          throw new AppError(
            "Bulan " +
              row.month +
              " di luar tempoh kiraan " +
              row.familyId +
              ".",
          );
        const duplicate = (
          await tx.execute({
            sql: "SELECT payment_id FROM payments WHERE lower(trim(transaction_reference))=lower(trim(?)) AND approval_status!='Rejected'",
            args: [row.reference],
          })
        ).rows;
        if (duplicate.length)
          throw new AppError(
            "Rujukan " +
              row.reference +
              " sudah wujud. Keseluruhan batch dibatalkan.",
            409,
          );
        if (row.expected !== undefined) {
          if (row.count === undefined)
            throw new AppError(
              "Bilangan ahli diperlukan bersama caruman sebenar.",
            );
          await tx.execute({
            sql: "UPDATE monthly_assessments SET expected=?,active_count=?,rate=?,confirmed=1,source=?,updated_at=? WHERE family_id=? AND month=?",
            args: [
              row.expected,
              row.count,
              row.count ? row.expected / row.count : 0,
              input.note,
              new Date().toISOString(),
              row.familyId,
              row.month,
            ],
          });
        }
        await tx.execute({
          sql: "INSERT INTO payments(payment_id,family_id,payment_date,payment_month_year,amount_paid,expected_amount,transaction_reference,approval_status,reviewed_by,reviewed_at,submitted_by,entry_note,created_at) VALUES(?,?,?,?,?,?,?,'Approved',?,?,?,?,?)",
          args: [
            randomUUID(),
            row.familyId,
            row.date,
            row.month,
            row.amount,
            row.expected ?? Number(month.expected),
            row.reference,
            actor.name,
            new Date().toISOString(),
            actor.sub,
            input.note,
            new Date().toISOString(),
          ],
        });
      }
      await tx.execute({
        sql: "INSERT INTO import_batches VALUES(?,?,?,?,?)",
        args: [
          randomUUID(),
          actor.sub,
          input.rows.length,
          JSON.stringify({
            kind: "Historical payments",
            total,
            note: input.note,
          }),
          new Date().toISOString(),
        ],
      });
      await auditWrite(tx, actor, "Import transaksi sejarah", {
        rows: input.rows.length,
        total,
        note: input.note,
      });
    });
    return json({ ok: true, rows: input.rows.length, total }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
