import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui";
import { formatDate, formatMonth, formatRM } from "@/lib/format";
import { getPayment } from "@/lib/queries";
import { ReviewPanel } from "./review-panel";

export default async function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await getPayment(id);
  return (
    <div className="space-y-4">
      <Link href="/admin/approvals" className="text-sm font-semibold text-brand-blue">
        Back to approvals
      </Link>
      <h1 className="text-3xl font-semibold">Verify payment</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Bukti Pembayaran</p>
          {payment.receiptUrl ? (
            <img src={payment.receiptUrl} alt="Payment receipt" className="max-h-[520px] w-full rounded-2xl bg-slate-50 object-contain" />
          ) : (
            <p className="text-sm text-slate-500">No receipt was uploaded.</p>
          )}
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">
              {payment.familyId} · {payment.wakilName}
            </p>
            <StatusPill status={payment.approvalStatus} />
          </div>
          <Detail label="Payment month" value={formatMonth(payment.paymentMonthYear)} />
          <Detail label="Payment date" value={formatDate(payment.paymentDate)} />
          <Detail label="Amount paid" value={formatRM(payment.amountPaid)} />
          <Detail label="Expected amount" value={formatRM(payment.expectedAmount)} />
          <Detail label="Transaction reference" value={payment.transactionReference} />
          <Detail label="Phone" value={payment.wakilPhone ?? "—"} />
          {payment.rejectionReason ? <Detail label="Rejection reason" value={payment.rejectionReason} /> : null}
          {payment.reviewedBy ? <Detail label="Reviewed by" value={`${payment.reviewedBy} · ${payment.reviewedAt ? formatDate(payment.reviewedAt) : ""}`} /> : null}
          <ReviewPanel paymentId={payment.paymentId} pending={payment.approvalStatus === "Pending"} />
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
