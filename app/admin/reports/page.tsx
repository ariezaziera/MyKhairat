import Link from "next/link";
import { CollectionChart } from "@/components/collection-chart";
import { Card, Stat } from "@/components/ui";
import { formatMonth, formatMonthShort, formatRM } from "@/lib/format";
import { getFinancialReport } from "@/lib/queries";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const params = await searchParams;
  const year = Number(params.year || new Date().getFullYear());
  const report = await getFinancialReport(year);
  const chart = report.monthly.map((row) => ({
    label: formatMonthShort(row.month),
    expected: row.expected,
    collected: row.collected,
  }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Master Financial Report</h1>
          <p className="text-sm text-slate-500">Expected collections use the current active member count and base rate.</p>
        </div>
        <a href={`/api/reports/financial/pdf?year=${year}`} className="rounded-2xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white">
          Download PDF
        </a>
      </div>
      <div className="flex gap-2">
        {[year - 1, year, year + 1].map((item) => (
          <Link
            key={item}
            href={`/admin/reports?year=${item}`}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${item === year ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {item}
          </Link>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Total Fund Balance" value={formatRM(report.totalFundBalance)} hint="All approved payments minus payouts" />
        <Stat label="Expected this year" value={formatRM(report.yearExpected)} />
        <Stat label="Collected this year" value={formatRM(report.yearCollected)} />
      </div>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Monthly collection</h2>
        <CollectionChart data={chart} />
      </Card>
      <details className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-200" open>
        <summary className="cursor-pointer text-lg font-semibold">Monthly table</summary>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Month</th>
                <th className="py-2">Expected</th>
                <th className="py-2">Collected</th>
                <th className="py-2">Gap</th>
              </tr>
            </thead>
            <tbody>
              {report.monthly.map((row) => (
                <tr key={row.month} className="border-t border-slate-100">
                  <td className="py-2">{formatMonth(row.month)}</td>
                  <td>{formatRM(row.expected)}</td>
                  <td>{formatRM(row.collected)}</td>
                  <td>{formatRM(row.expected - row.collected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
