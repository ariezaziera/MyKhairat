import Link from "next/link";
import { getAdminDashboard, getSettings } from "@/lib/queries";
import { requireAdminPage } from "@/lib/page-auth";
import { can } from "@/lib/permissions";
import { formatRM, formatMonth } from "@/lib/format";
import { PageHeading } from "@/components/page-heading";
import { FamilyScene } from "@/components/family-scene";
import { Card, Stat, Alert } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
export default async function AdminPage() {
  const session = await requireAdminPage(),
    d = await getAdminDashboard(),
    settings = await getSettings();
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Ruang kerja AJK"
        title="Amanah keluarga, dalam satu tempat"
        description="Rekod resit yang diterima melalui WhatsApp. Semak bayaran dan pastikan bantuan sampai kepada keluarga."
      />
      <div className="hero-panel grid items-center gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative z-10">
          <p className="eyebrow">Kerja hari ini</p>
          <h2 className="text-3xl font-semibold">
            {d.pendingCount
              ? `${d.pendingCount} resit menunggu semakan`
              : "Semakan resit terkini selesai"}
          </h2>
          <p className="mt-3 max-w-lg leading-8 text-slate-600">
            Portal wakil ialah pilihan. AJK boleh mengurus rekod keluarga
            daripada resit WhatsApp tanpa meminta wakil login.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {can(session.accessProfile, "payments") && (
              <Link href="/admin/payments/new" className="action-link">
                Rekod resit WhatsApp
              </Link>
            )}
            <Link href="/admin/approvals" className="secondary-link">
              Semak resit
            </Link>
          </div>
        </div>
        <FamilyScene compact />
      </div>
      {!settings.hasDuitnowQr && can(session.accessProfile, "settings") && (
        <Alert>
          <Link href="/admin/duitnow" className="font-semibold underline">
            Tetapkan QR DuitNow
          </Link>{" "}
          supaya wakil boleh menyimpan atau mengimbasnya.
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Baki buku dana"
          value={formatRM(d.totalFundBalance)}
          hint="Padankan dengan ledger & penyata bank"
        />
        <Stat
          label="Resit belum disemak"
          value={String(d.pendingCount)}
          hint="Kutipan belum disahkan"
        />
        <Stat label="Keluarga tertunggak" value={String(d.overdueFamilies)} />
        <Stat
          label="Keluarga aktif"
          value={`${d.activeFamilies} / ${d.families}`}
          hint={`${d.suspendedFamilies} digantung`}
        />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Resit untuk disemak</h2>
            <Link
              className="font-semibold text-blue-800"
              href="/admin/approvals"
            >
              Lihat semua →
            </Link>
          </div>
          {!d.pending.length ? (
            <EmptyState
              title="Tiada resit menunggu"
              description="Resit baharu akan muncul di sini selepas direkod oleh AJK atau wakil."
            />
          ) : (
            <ul className="divide-y divide-slate-200">
              {d.pending.map((p) => (
                <li
                  key={p.paymentId}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold">
                      {p.wakilName} · {p.familyId}
                    </p>
                    <p className="mt-2 text-slate-600">
                      {formatMonth(p.paymentMonthYear)} ·{" "}
                      {formatRM(p.amountPaid)}
                    </p>
                  </div>
                  <Link
                    className="secondary-link"
                    href={"/admin/approvals/" + p.paymentId}
                  >
                    Semak
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="text-xl font-semibold">Keluarga & bantuan</h2>
            <div className="mt-5 space-y-3">
              <Link
                className="secondary-link w-full justify-between"
                href="/admin/requests"
              >
                Permohonan ahli <strong>{d.requestCount}</strong>
              </Link>
              <Link
                className="secondary-link w-full justify-between"
                href="/admin/claims"
              >
                Tuntutan bantuan <span>→</span>
              </Link>
              <Link
                className="secondary-link w-full justify-between"
                href="/admin/fund"
              >
                Ledger & semakan bank <span>→</span>
              </Link>
            </div>
          </Card>
          <Card>
            <p className="eyebrow">Caruman tahun ini</p>
            <p className="text-3xl font-semibold">
              {formatRM(d.yearCollected)}
            </p>
            <p className="mt-3 text-slate-600">
              Jangkaan {formatRM(d.yearExpected)}. Kiraan sejarah belum disahkan
              perlu disemak dengan rekod asal.
            </p>
            <Link
              className="mt-4 inline-block font-semibold text-blue-800"
              href="/admin/reports"
            >
              Buka laporan →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
