import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Card, Alert } from "@/components/ui";
import { PageHeading } from "@/components/page-heading";
import { FamilyScene } from "@/components/family-scene";
import { formatRM, formatMonth } from "@/lib/format";
import { malaysiaMonth } from "@/lib/dates";
import { requireWakilPage } from "@/lib/page-auth";
import { getFamilyBundle } from "@/lib/queries";
import { whatsappHref } from "@/lib/business";
export default async function FamilyPage() {
  const session = await requireWakilPage();
  const b = await getFamilyBundle(session.familyId!);
  const current = b.assessment.months.find((r) => r.month === malaysiaMonth());
  const paid = current?.settled,
    pending = current?.hasPending;
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={`Keluarga ${b.family.familyId}`}
        title={`Salam, ${b.family.wakilName}`}
        description="Semak rekod bila diperlukan. Resit boleh terus dihantar melalui WhatsApp."
        actions={<StatusPill status={b.family.familyStatus} />}
      />
      {b.assessment.historyNeedsReview > 0 && (
        <Alert>
          AJK sedang mengesahkan {b.assessment.historyNeedsReview} bulan rekod
          lama. Baki sejarah masih anggaran sehingga disahkan.
        </Alert>
      )}
      {b.family.familyStatus === "Suspended" && (
        <Alert tone="danger">
          Keahlian sedang digantung. Hubungi AJK untuk semakan tunggakan dan
          bantuan.
        </Alert>
      )}
      <div className="hero-panel grid items-center gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative z-10">
          <p className="eyebrow">{formatMonth(malaysiaMonth())}</p>
          <h2 className="text-2xl font-semibold">
            {paid
              ? "Caruman bulan ini selesai"
              : pending
                ? "Bukti bayaran sedang disemak"
                : "Baki caruman bulan ini"}
          </h2>
          <p className="my-4 text-4xl font-semibold tracking-tight">
            {formatRM(current?.outstanding ?? 0)}
          </p>
          <p className="text-slate-600">
            {current?.expected !== undefined
              ? `Jumlah bulan ini ${formatRM(current.expected)}. `
              : ""}
            {b.assessment.activeCount} ahli aktif dalam keluarga.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {b.settings.supportPhone && (
              <a
                className="action-link"
                href={whatsappHref(
                  b.settings.supportPhone,
                  `Assalamualaikum, resit keluarga ${b.family.familyId} untuk ${malaysiaMonth()}.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Hantar resit di WhatsApp
              </a>
            )}
            {!paid && !pending && (
              <Link
                className={
                  b.settings.supportPhone ? "secondary-link" : "action-link"
                }
                href="/app/payment"
              >
                Hantar bukti melalui portal
              </Link>
            )}
            <Link className="secondary-link" href="/app/ledger">
              Semak rekod bayaran
            </Link>
          </div>
        </div>
        <FamilyScene compact />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-600">
            Baki keseluruhan{" "}
            {b.assessment.bakiSemasa < 0 ? "· kredit" : "· perlu dibayar"}
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {formatRM(Math.abs(b.assessment.bakiSemasa))}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {b.assessment.historyNeedsReview
              ? "Termasuk sejarah yang belum disahkan."
              : "Termasuk semua bulan dan baki asal."}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-600">Ahli keluarga</p>
          <p className="mt-3 text-3xl font-semibold">
            {b.members.length} orang
          </p>
          <Link
            className="mt-4 inline-block font-semibold text-blue-800"
            href="/app/dependents"
          >
            Lihat senarai ahli →
          </Link>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-600">
            Penyata & bantuan
          </p>
          <div className="mt-4 space-y-4">
            <Link
              className="block font-semibold text-blue-800"
              href="/app/statement"
            >
              Muat turun penyata →
            </Link>
            <Link
              className="block font-semibold text-blue-800"
              href="/app/help"
            >
              Hubungi AJK →
            </Link>
          </div>
        </Card>
      </div>
      <Card>
        <h2 className="text-xl font-semibold">
          Saling membantu ketika diperlukan
        </h2>
        <p className="mt-3 leading-8 text-slate-600">
          Khairat kematian {formatRM(b.settings.deathPayoutAmount)} · Bantuan
          wad kritikal {formatRM(b.settings.wardedPayoutAmount)}. Jumlah dan
          kelayakan tertakluk persetujuan keluarga serta semakan AJK.
        </p>
      </Card>
    </div>
  );
}
