import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui";
import { formatDate, formatMonth, formatRM } from "@/lib/format";
import { listPayments } from "@/lib/queries";

const filters = ["Pending", "Approved", "Rejected", "All"] as const;

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = filters.includes(params.status as (typeof filters)[number]) ? params.status : "Pending";
  const payments = await listPayments({ status: status === "All" ? undefined : status });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Pending Approvals</h1>
        <p className="text-sm text-slate-500">Verify the transaction reference and bukti pembayaran together.</p>
      </div>
      <div className="flex gap-2">
        {filters.map((item) => (
          <Link
            key={item}
            href={item === "Pending" ? "/admin/approvals" : `/admin/approvals?status=${item}`}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${status === item ? "bg-brand-blue text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {item}
          </Link>
        ))}
      </div>
      {payments.length === 0 ? <Card>No payments in this list.</Card> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {payments.map((payment) => (
          <li key={payment.paymentId}>
            <Link href={`/admin/approvals/${payment.paymentId}`} className="block">
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {payment.familyId} · {payment.wakilName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatMonth(payment.paymentMonthYear)} · {formatDate(payment.paymentDate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Ref {payment.transactionReference}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatRM(payment.amountPaid)}</p>
                    <div className="mt-2">
                      <StatusPill status={payment.approvalStatus} />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
