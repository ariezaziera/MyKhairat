import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Alert, Card } from "@/components/ui";
import { formatRM } from "@/lib/format";
import { requireWakilPage } from "@/lib/page-auth";
import { getFamilyBundle } from "@/lib/queries";

export default async function FamilyProfilePage() {
  const session = await requireWakilPage();
  const bundle = await getFamilyBundle(session.familyId!);
  const { family, assessment, settings } = bundle;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Family ID</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{family.familyId}</h1>
          <p className="mt-1 text-slate-600">{family.wakilName}</p>
        </div>
        <StatusPill status={family.familyStatus} />
      </div>
      {family.familyStatus === "Suspended" ? (
        <Alert tone="danger">
          This family is Suspended after {assessment.consecutiveUnpaid} consecutive unpaid months. Members are not eligible for Khairat Kematian until the arrears are cleared.
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Active Members</p>
          <p className="mt-2 text-3xl font-semibold">{assessment.activeCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly Dues</p>
          <p className="mt-2 text-3xl font-semibold">{formatRM(assessment.monthlyDues)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Baki awal</p>
          <p className="mt-2 text-3xl font-semibold">{formatRM(assessment.bakiAwal)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Baki semasa</p>
          <p className={`mt-2 text-3xl font-semibold ${assessment.bakiSemasa > 0 ? "text-rose-600" : "text-brand-green"}`}>
            {formatRM(assessment.bakiSemasa)}
          </p>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <Card>
          <h2 className="text-lg font-semibold">Bayaran bulan ini</h2>
          <p className="mt-2 text-3xl font-semibold">{formatRM(assessment.monthlyDues)}</p>
          <p className="mt-2 text-base leading-7 text-slate-700">
            {assessment.activeCount} orang × {formatRM(settings.baseRatePerMember)}. Pay by day {settings.paymentDueDay}.
          </p>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Khairat kematian {formatRM(settings.deathPayoutAmount)}. Masuk wad (kes kritikal) {formatRM(settings.wardedPayoutAmount)}. Ask the AJK to record the claim.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Pay {settings.bankName} {settings.bankAccountNumber} · {settings.bankAccountName}
            {settings.duitnowId ? ` · DuitNow ${settings.duitnowId}` : ""}
          </p>
          {settings.hasDuitnowQr ? (
            <img src="/api/duitnow/qr" alt="DuitNow QR" className="mt-4 w-full max-w-[200px] rounded-2xl bg-slate-50 object-contain" />
          ) : null}
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Link href="/app/payment" className="rounded-2xl bg-brand-blue px-4 py-5 text-center text-lg font-semibold text-white">
            Bayar bulan ini
          </Link>
          <Link href="/app/dependents" className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-sm font-semibold text-slate-800">
            View Dependents
          </Link>
          <Link href="/app/statement" className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-sm font-semibold text-slate-800 sm:col-span-2 lg:col-span-1">
            Family Statement
          </Link>
        </div>
      </div>
    </div>
  );
}
