import { requireAdminPage } from "@/lib/page-auth";
import { can } from "@/lib/permissions";
import { AssessmentBoard } from "./assessment-board";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui";
import { formatMonth, formatRM } from "@/lib/format";
import { getFamilyBundle } from "@/lib/queries";
import { FamilyForm } from "../family-form";
import { ManualPayment } from "./manual-payment";
import { MemberTools } from "./member-tools";

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminPage();
  const { id } = await params;
  const bundle = await getFamilyBundle(id);
  return (
    <div className="space-y-5">
      <Link
        href="/admin/families"
        className="text-sm font-semibold text-brand-blue"
      >
        Back to directory
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{bundle.family.familyId}</h1>
          <p className="text-slate-500">{bundle.family.wakilName}</p>
          <p className="text-sm font-semibold text-brand-blue">
            Username: {bundle.family.username ?? "Belum dijana"}
          </p>
        </div>
        <StatusPill status={bundle.family.familyStatus} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Ahli aktif
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {bundle.assessment.activeCount}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Caruman bulanan
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatRM(bundle.assessment.monthlyDues)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Baki semasa
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatRM(bundle.assessment.bakiSemasa)}
          </p>
        </Card>
      </div>
      {can(session.accessProfile, "families") && (
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
      )}
      <AssessmentBoard familyId={id} snapshots={bundle.snapshots} />
      <MemberTools
        familyId={bundle.family.familyId}
        members={bundle.members}
        claims={bundle.claims}
        deathPayout={bundle.settings.deathPayoutAmount}
        wardedPayout={bundle.settings.wardedPayoutAmount}
      />
      {can(session.accessProfile, "payments") && (
        <ManualPayment
          familyId={bundle.family.familyId}
          suggested={bundle.assessment.monthlyDues}
          months={bundle.assessment.months.map((row) => ({
            month: row.month,
            state: row.hasPending ? "Pending" : row.state,
            outstanding: row.outstanding,
          }))}
        />
      )}
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Bayaran terkini</h2>
        <ul className="space-y-2 text-sm">
          {bundle.payments.slice(0, 8).map((payment) => (
            <li
              key={payment.paymentId}
              className="flex items-center justify-between gap-3"
            >
              <Link
                href={`/admin/approvals/${payment.paymentId}`}
                className="font-medium text-brand-blue"
              >
                {formatMonth(payment.paymentMonthYear)} ·{" "}
                {formatRM(payment.amountPaid)}
              </Link>
              <StatusPill status={payment.approvalStatus} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
