import Link from "next/link";
import { listDirectory } from "@/lib/queries";
import { requireAdminPage } from "@/lib/page-auth";
import { can } from "@/lib/permissions";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { formatRM } from "@/lib/format";
export default async function Directory({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await requireAdminPage(),
    p = await searchParams;
  const all = (await listDirectory(p.q || "")).filter(
    (f) => !p.status || f.familyStatus === p.status,
  );
  const totalPages = Math.max(1, Math.ceil(all.length / 12)),
    page = Math.min(totalPages, Math.max(1, Math.floor(Number(p.page) || 1))),
    families = all.slice((page - 1) * 12, page * 12);
  const pageHref = (n: number) =>
    "/admin/families?" +
    new URLSearchParams({
      q: p.q || "",
      status: p.status || "",
      page: String(n),
    });
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Direktori keluarga"
        title="Kenali setiap keluarga"
        description={`${all.length} keluarga dalam senarai ini.`}
        actions={
          can(session.accessProfile, "families") ? (
            <>
              <Link href="/admin/families/import" className="secondary-link">
                Import Excel
              </Link>
              <Link href="/admin/families/new" className="action-link">
                Daftar keluarga
              </Link>
            </>
          ) : undefined
        }
      />
      <form className="surface-panel grid items-end gap-4 p-5 sm:grid-cols-[1fr_200px_auto]">
        <label className="mb-0">
          Nama / ID / telefon
          <input
            name="q"
            defaultValue={p.q || ""}
            placeholder="Cari keluarga…"
          />
        </label>
        <label className="mb-0">
          Status
          <select name="status" defaultValue={p.status || ""}>
            <option value="">Semua status</option>
            <option value="Active">Aktif</option>
            <option value="Suspended">Digantung</option>
            <option value="Inactive">Tidak aktif</option>
          </select>
        </label>
        <button className="action-link">Cari keluarga</button>
      </form>
      {!families.length ? (
        <EmptyState
          title="Tiada keluarga ditemui"
          description="Cuba nama atau ID lain, atau kosongkan penapis."
          action={
            <Link className="secondary-link" href="/admin/families">
              Tetapkan semula carian
            </Link>
          }
        />
      ) : (
        <>
          <div className="surface-panel hidden overflow-x-auto p-5 lg:block">
            <table className="w-full text-left">
              <thead>
                <tr className="text-sm text-slate-600">
                  <th className="pb-4">Keluarga</th>
                  <th>Wakil</th>
                  <th>Ahli aktif</th>
                  <th>Caruman</th>
                  <th>Tunggakan</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Tindakan</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {families.map((f) => (
                  <tr key={f.familyId} className="border-t border-slate-200">
                    <td className="py-5 font-medium text-blue-800">
                      {f.familyId}
                    </td>
                    <td className="pr-4">
                      <p className="font-semibold">{f.wakilName}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {f.wakilPhone}
                      </p>
                    </td>
                    <td>{f.activeMembers}</td>
                    <td>{formatRM(f.monthlyDues)}</td>
                    <td>{formatRM(f.arrearsAmount)}</td>
                    <td>
                      <StatusPill status={f.familyStatus} />
                    </td>
                    <td>
                      <Link
                        className="secondary-link"
                        href={"/admin/families/" + f.familyId}
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {families.map((f) => (
              <Link
                key={f.familyId}
                href={"/admin/families/" + f.familyId}
                className="surface-panel p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-blue-800">
                    {f.familyId}
                  </p>
                  <StatusPill status={f.familyStatus} />
                </div>
                <h2 className="mt-4 break-words text-xl font-semibold">
                  {f.wakilName}
                </h2>
                <p className="mt-3 text-slate-600">
                  {f.activeMembers} ahli aktif · {formatRM(f.monthlyDues)} /
                  bulan
                </p>
                <p className="mt-2 text-slate-600">
                  Tunggakan {formatRM(f.arrearsAmount)}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
      <nav
        aria-label="Halaman direktori"
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <p className="text-slate-600">
          Halaman {page} daripada {totalPages}
        </p>
        <div className="flex gap-3">
          {page > 1 && (
            <Link className="secondary-link" href={pageHref(page - 1)}>
              Sebelumnya
            </Link>
          )}
          {page < totalPages && (
            <Link className="secondary-link" href={pageHref(page + 1)}>
              Seterusnya
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
