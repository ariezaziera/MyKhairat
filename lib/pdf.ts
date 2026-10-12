import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatMonth, formatRM } from "./format";
import type { getFinancialReport, getStatement } from "./queries";

type StatementData = Awaited<ReturnType<typeof getStatement>>;
type FinancialData = Awaited<ReturnType<typeof getFinancialReport>>;

const blue = rgb(0.114, 0.306, 0.847);
const green = rgb(0.082, 0.502, 0.239);
const ink = rgb(0.102, 0.137, 0.196);
const muted = rgb(0.4, 0.45, 0.5);

function drawHeader(
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  title: string,
) {
  page.drawRectangle({ x: 0, y: 790, width: 595, height: 52, color: blue });
  page.drawText("MyKhairat", {
    x: 40,
    y: 812,
    size: 16,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Sistem Dana Kita", {
    x: 130,
    y: 814,
    size: 10,
    font,
    color: rgb(0.9, 0.95, 1),
  });
  page.drawText(title, { x: 40, y: 760, size: 18, font: bold, color: ink });
}

export async function statementPdf(data: StatementData) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  drawHeader(page, font, bold, "Penyata keluarga");
  const lines = [
    `Family ID: ${data.family.familyId}`,
    `Wakil: ${data.family.wakilName}`,
    `Telefon: ${data.family.wakilPhone}`,
    `Status: ${data.family.familyStatus}`,
    `Ahli aktif: ${data.assessment.activeCount}`,
    `Caruman bulan ini: ${formatRM(data.assessment.monthlyDues)}`,
    `Baki awal: ${formatRM(data.assessment.bakiAwal)}`,
    `Baki semasa: ${formatRM(data.assessment.bakiSemasa)}`,
    `Tahun: ${data.year}`,
  ];
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 40,
      y: 730 - index * 16,
      size: 11,
      font,
      color: ink,
    });
  });
  let y = 570;
  page.drawText("Bulan", { x: 40, y, size: 10, font: bold, color: muted });
  page.drawText("Jangkaan", { x: 220, y, size: 10, font: bold, color: muted });
  page.drawText("Paid", { x: 330, y, size: 10, font: bold, color: muted });
  page.drawText("Status", { x: 440, y, size: 10, font: bold, color: muted });
  y -= 8;
  page.drawLine({
    start: { x: 40, y },
    end: { x: 555, y },
    thickness: 1,
    color: rgb(0.9, 0.91, 0.93),
  });
  data.rows.forEach((row) => {
    y -= 22;
    const mark = !row.confirmed
      ? "Perlu semakan"
      : row.state === "Paid"
        ? "Selesai"
        : row.state === "BeforeJoin"
          ? "-"
          : row.state;
    page.drawText(formatMonth(row.month), {
      x: 40,
      y,
      size: 10,
      font,
      color: ink,
    });
    page.drawText(
      row.state === "BeforeJoin" || row.state === "Upcoming"
        ? "-"
        : formatRM(row.expected),
      {
        x: 220,
        y,
        size: 10,
        font,
        color: ink,
      },
    );
    page.drawText(formatRM(row.paid), {
      x: 330,
      y,
      size: 10,
      font,
      color: ink,
    });
    page.drawText(mark, {
      x: 440,
      y,
      size: 10,
      font: bold,
      color: row.state === "Paid" ? green : ink,
    });
  });
  page.drawText(
    `Dijana ${new Date().toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}`,
    { x: 40, y: 40, size: 9, font, color: muted },
  );
  return pdf.save();
}

export async function financialPdf(data: FinancialData) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  drawHeader(page, font, bold, "Laporan kewangan");
  const summary = [
    `Year: ${data.year}`,
    `Baki buku dana: ${formatRM(data.totalFundBalance)}`,
    `Approved collections (all time): ${formatRM(data.collectedAll)}`,
    `Khairat payouts: ${formatRM(data.paidOut)}`,
    `Expected this year: ${formatRM(data.yearExpected)}`,
    `Collected this year: ${formatRM(data.yearCollected)}`,
    `Families overdue: ${data.overdueFamilies}`,
  ];
  summary.forEach((line, index) => {
    page.drawText(line, {
      x: 40,
      y: 730 - index * 18,
      size: 12,
      font,
      color: ink,
    });
  });
  let y = 580;
  page.drawText("Month", { x: 40, y, size: 10, font: bold, color: muted });
  page.drawText("Expected", { x: 240, y, size: 10, font: bold, color: muted });
  page.drawText("Diterima", { x: 380, y, size: 10, font: bold, color: muted });
  data.monthly.forEach((row) => {
    y -= 24;
    page.drawText(formatMonth(row.month), {
      x: 40,
      y,
      size: 11,
      font,
      color: ink,
    });
    page.drawText(formatRM(row.expected), {
      x: 240,
      y,
      size: 11,
      font,
      color: ink,
    });
    page.drawText(formatRM(row.collected), {
      x: 380,
      y,
      size: 11,
      font,
      color: green,
    });
  });
  page.drawText(
    "Jangkaan menggunakan snapshot bulanan. Semak sejarah yang belum disahkan.",
    {
      x: 40,
      y: 48,
      size: 9,
      font,
      color: muted,
    },
  );
  return pdf.save();
}

export function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
