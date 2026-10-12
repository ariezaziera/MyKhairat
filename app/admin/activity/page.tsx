import Link from "next/link";
import { Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireAdminPage } from "@/lib/page-auth";
import { listActivity } from "@/lib/queries";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const page = Math.max(1, Math.min(100000, Number(params.page) || 1));
  const rows = await listActivity(params.q || "", page);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Jejak audit</h1>
        <p className="text-sm text-slate-500">
          Siapa melakukan perubahan, bila dan apakah data yang berubah. Password
          dan IC penuh tidak direkod dalam log.
        </p>
      </div>
      <form className="flex flex-wrap gap-3">
        <label className="flex-1">
          Cari tindakan / nama
          <input name="q" defaultValue={params.q || ""} />
        </label>
        <button className="action-link self-end">Cari audit</button>
      </form>
      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No admin actions have been recorded yet.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Card className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                    {row.action}
                  </p>
                  <p className="mt-1 text-sm text-slate-800">{row.detail}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.actorName}</p>
                </div>
                <p className="text-xs text-slate-600">
                  {formatDate(row.createdAt)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        {page > 1 && (
          <Link
            className="secondary-link"
            href={
              "?" +
              new URLSearchParams({ q: params.q || "", page: String(page - 1) })
            }
          >
            Sebelumnya
          </Link>
        )}
        {rows.length === 80 && (
          <Link
            className="secondary-link"
            href={
              "?" +
              new URLSearchParams({ q: params.q || "", page: String(page + 1) })
            }
          >
            Seterusnya
          </Link>
        )}
      </div>
    </div>
  );
}
