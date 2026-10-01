import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui";
import { formatMonth, formatRM } from "@/lib/format";
import { requireWakilPage } from "@/lib/page-auth";
import { getStatement } from "@/lib/queries";

export default async function StatementPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const session = await requireWakilPage();
  const params = await searchParams;
  const year = Number(params.year || new Date().getFullYear());
  const statement = await getStatement(session.familyId!, year);
  const years = [year - 1, year, year + 1];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Family Statement</h1>
          <p className="text-sm text-slate-500">{statement.family.familyId}</p>
        </div>
        <a
          href={`/api/reports/statement/${statement.family.familyId}/pdf?year=${year}`}
          className="rounded-2xl bg-brand-blue px-3 py-2 text-xs font-semibold text-white"
        >
          Download as PDF
        </a>
      </div>
      <div className="flex gap-2">
        {years.map((item) => (
          <Link
            key={item}
            href={`/app/statement?year=${item}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${item === year ? "bg-brand-blue text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {item}
          </Link>
        ))}
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Month</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {statement.rows.map((row) => (
              <tr key={row.month} className="border-t border-slate-100">
                <td className="px-3 py-3">
                  <p className="font-medium">{formatMonth(row.month)}</p>
                  <p className="text-xs text-slate-500">
                    {row.state === "BeforeJoin" || row.state === "Upcoming" ? "—" : `${formatRM(row.paid)} / ${formatRM(row.expected)}`}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {row.state === "Paid" ? <Check className="h-4 w-4 text-brand-green" /> : <Minus className="h-4 w-4 text-slate-300" />}
                    <StatusPill status={row.state} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <div className="flex justify-between text-sm">
          <span>Baki awal</span>
          <span className="font-semibold">{formatRM(statement.assessment.bakiAwal)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span>Baki semasa</span>
          <span className="font-semibold">{formatRM(statement.assessment.bakiSemasa)}</span>
        </div>
      </Card>
    </div>
  );
}
