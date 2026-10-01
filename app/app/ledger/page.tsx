import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui";
import { formatDate, formatMonth, formatRM } from "@/lib/format";
import { requireWakilPage } from "@/lib/page-auth";
import { getFamilyBundle } from "@/lib/queries";

export default async function LedgerPage() {
  const session = await requireWakilPage();
  const bundle = await getFamilyBundle(session.familyId!);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Payment Ledger</h1>
        <p className="text-sm text-slate-500">Log Masuk Duit for {bundle.family.familyId}</p>
      </div>
      {bundle.payments.length === 0 ? <Card>No payments yet.</Card> : null}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {bundle.payments.map((payment) => (
          <li key={payment.paymentId}>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{formatMonth(payment.paymentMonthYear)}</p>
                  <p className="text-xs text-slate-500">{formatDate(payment.paymentDate)}</p>
                  <p className="mt-2 text-xs text-slate-500">Ref {payment.transactionReference}</p>
                  {payment.entryNote ? <p className="mt-1 text-xs text-slate-500">{payment.entryNote}</p> : null}
                  {payment.rejectionReason ? <p className="mt-1 text-xs text-rose-600">{payment.rejectionReason}</p> : null}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatRM(payment.amountPaid)}</p>
                  <div className="mt-2">
                    <StatusPill status={payment.approvalStatus} />
                  </div>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
