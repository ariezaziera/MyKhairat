import ExcelJS from "exceljs";
import { Readable } from "stream";
import { requireAdmin, json, errorResponse } from "@/lib/guard";
import { detectMapping } from "@/lib/family-import";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 3_000_000) return json({ error: "Pilih fail Excel .xlsx atau CSV bawah 3MB." }, 400);
    const workbook = new ExcelJS.Workbook(); const bytes = Buffer.from(await file.arrayBuffer());
    if (/\.xlsx$/i.test(file.name)) await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    else if (/\.csv$/i.test(file.name)) await workbook.csv.read(Readable.from(bytes));
    else return json({ error: "Simpan fail lama .xls sebagai .xlsx dahulu." }, 400);
    const sheets = workbook.worksheets.map((sheet) => {
      if (sheet.rowCount > 2001 || sheet.columnCount > 100) throw new Error("Fail melebihi 2,000 baris atau 100 kolum. Pecahkan fail kepada bahagian kecil.");
      const rows: string[][] = [];
      sheet.eachRow({ includeEmpty: true }, (row) => rows.push(Array.from({ length: sheet.columnCount }, (_, i) => row.getCell(i + 1).text.trim())));
      const headerRow = rows.slice(0, 30).findIndex((row) => detectMapping(row).wakil >= 0);
      const index = headerRow >= 0 ? headerRow : rows.findIndex((row) => row.some(Boolean));
      return { name: sheet.name, headers: rows[index] ?? [], rows: rows.slice(index + 1), mapping: detectMapping(rows[index] ?? []) };
    }).filter((sheet) => sheet.headers.length);
    if (!sheets.length) return json({ error: "Fail kosong." }, 400);
    return json({ sheets });
  } catch (error) { if (error instanceof Error && error.message.startsWith("Fail melebihi")) return json({ error: error.message }, 400); return errorResponse(error); }
}
