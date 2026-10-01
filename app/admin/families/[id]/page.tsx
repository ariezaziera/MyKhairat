import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui";
import { formatMonth, formatRM } from "@/lib/format";
import { getFamilyBundle } from "@/lib/queries";
import { FamilyForm } from "../family-form";
import { ManualPayment } from "./manual-payment";
import { MemberTools } from "./member-tools";

export default async function FamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getFamilyBundle(id);
  return (
    <div className="space-y-5">
      <Link href="/admin/families" className="text-sm font-semibold text-brand-blue">
        Back to directory
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{bundle.family.familyId}</h1>
          <p className="text-slate-500">{bundle.family.wakilName}</p>
        </div>
        <StatusPill status={bundle.family.familyStatus} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Active members</p>
          <p className="mt-1 text-2xl font-semibold">{bundle.assessment.activeCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Monthly dues</p>
          <p className="mt-1 text-2xl font-semibold">{formatRM(bundle.assessment.monthlyDues)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Baki semasa</p>
          <p className="mt-1 text-2xl font-semibold">{formatRM(bundle.assessment.bakiSemasa)}</p>
        </Card>
      </div>
      <FamilyForm
        initial={{
          familyId: bundle.family.familyId,
          wakilName: bundle.family.wakilName,
          wakilPhone: bundle.family.wakilPhone,
          email: bundle.family.email ?? "",
          familyStatus: bundle.family.familyStatus,
          joinedMonth: bundle.family.joinedMonth,
          openingBalance: bundle.family.openingBalance,
          notes: bundle.family.notes ?? "",
        }}
      />
      <MemberTools
        familyId={bundle.family.familyId}
        members={bundle.members}
        claims={bundle.claims}
        deathPayout={bundle.settings.deathPayoutAmount}
        wardedPayout={bundle.settings.wardedPayoutAmount}
      />
      <ManualPayment
        familyId={bundle.family.familyId}
        suggested={bundle.assessment.monthlyDues}
        months={bundle.assessment.months.map((row) => ({
          month: row.month,
          state: row.state,
          outstanding: row.outstanding,
        }))}
      />
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Recent payments</h2>
        <ul className="space-y-2 text-sm">
          {bundle.payments.slice(0, 8).map((payment) => (
            <li key={payment.paymentId} className="flex items-center justify-between gap-3">
              <Link href={`/admin/approvals/${payment.paymentId}`} className="font-medium text-brand-blue">
                {formatMonth(payment.paymentMonthYear)} · {formatRM(payment.amountPaid)}
              </Link>
              <StatusPill status={payment.approvalStatus} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
