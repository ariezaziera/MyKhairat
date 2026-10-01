import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Card, Stat } from "@/components/ui";
import { formatMonth, formatRM } from "@/lib/format";
import { getAdminDashboard, getSettings } from "@/lib/queries";

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard();
  const settings = await getSettings();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500">Pending payments, fund balance, and families that need attention.</p>
      </div>
      {!settings.hasDuitnowQr ? (
        <Link href="/admin/duitnow" className="block rounded-3xl bg-blue-50 px-4 py-3 text-sm font-semibold text-brand-blue">
          Upload the DuitNow QR so families can scan it when they pay.
        </Link>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Pending approvals" value={String(dashboard.pendingCount)} hint="Log Masuk Duit waiting for review" />
        <Stat label="Total fund balance" value={formatRM(dashboard.totalFundBalance)} hint="Approved collections minus payouts" />
        <Stat label="Families overdue" value={String(dashboard.overdueFamilies)} />
        <Stat label="Suspended" value={String(dashboard.suspendedFamilies)} hint={`${dashboard.activeFamilies} active of ${dashboard.families}`} />
      </div>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pending Approvals</h2>
          <Link href="/admin/approvals" className="text-sm font-semibold text-brand-blue">
            View all
          </Link>
        </div>
        {dashboard.pending.length === 0 ? <p className="text-sm text-slate-500">No payments are waiting.</p> : null}
        <ul className="divide-y divide-slate-100">
          {dashboard.pending.map((payment) => (
            <li key={payment.paymentId} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">
                  {payment.familyId} · {payment.wakilName}
                </p>
                <p className="text-sm text-slate-500">
                  {formatMonth(payment.paymentMonthYear)} · {formatRM(payment.amountPaid)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={payment.approvalStatus} />
                <Link href={`/admin/approvals/${payment.paymentId}`} className="text-sm font-semibold text-brand-blue">
                  Review
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/requests" className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Member requests</p>
          <p className="mt-1 text-2xl font-semibold">{dashboard.requestCount}</p>
        </Link>
        <Link href="/admin/reports" className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Collected this year</p>
          <p className="mt-1 text-2xl font-semibold">{formatRM(dashboard.yearCollected)}</p>
        </Link>
        <Link href="/admin/arrears" className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Expected this year</p>
          <p className="mt-1 text-2xl font-semibold">{formatRM(dashboard.yearExpected)}</p>
        </Link>
      </div>
    </div>
  );
}
