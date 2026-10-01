import { Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireAdminPage } from "@/lib/page-auth";
import { listActivity } from "@/lib/queries";

export default async function ActivityPage() {
  await requireAdminPage();
  const rows = await listActivity();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Activity</h1>
        <p className="text-sm text-slate-500">Who changed settings, the DuitNow QR, accounts, payments, and claims.</p>
      </div>
      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No admin actions have been recorded yet.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Card className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">{row.action}</p>
                  <p className="mt-1 text-sm text-slate-800">{row.detail}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.actorName}</p>
                </div>
                <p className="text-xs text-slate-400">{formatDate(row.createdAt)}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
