import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui";
import { formatRM } from "@/lib/format";
import { listDirectory } from "@/lib/queries";

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const families = await listDirectory(params.q ?? "");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Master Directory</h1>
          <p className="text-sm text-slate-500">{families.length} families</p>
        </div>
        <Link href="/admin/families/new" className="rounded-2xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white">
          Add family
        </Link>
      </div>
      <form className="flex flex-col gap-2 sm:max-w-xl sm:flex-row">
        <input name="q" defaultValue={params.q ?? ""} placeholder="Search family ID or representative" />
        <button className="rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white">Search</button>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {families.map((family) => (
          <Link key={family.familyId} href={`/admin/families/${family.familyId}`} className="block">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-blue">{family.familyId}</p>
                  <p className="text-lg font-semibold">{family.wakilName}</p>
                  <p className="text-sm text-slate-500">
                    {family.totalMembers} members · {family.activeMembers} active · {formatRM(family.monthlyDues)} / month
                  </p>
                </div>
                <StatusPill status={family.familyStatus} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
