import Link from "next/link";
import { requireAdminPage } from "@/lib/page-auth";
import { getClient } from "@/lib/db";
import { Card } from "@/components/ui";
import { PageHeading } from "@/components/page-heading";
import { formatRM } from "@/lib/format";
import { ReviewActions } from "./actions";
export default async function ImportReviewPage() {
  await requireAdminPage("settings");
  const db=getClient();
  const batches=(await db.execute("SELECT id,source_name,summary,created_at FROM legacy_imports ORDER BY created_at DESC")).rows;
  const issues=(await db.execute("SELECT * FROM legacy_issues ORDER BY status,created_at,id")).rows;
  return <div className="space-y-6"><PageHeading eyebrow="Rekod sebelum sistem" title="Semakan import" description="Sumber asal dikekalkan. Rekod belum disahkan tidak menambah baki dana. Keputusan semakan direkod dalam jejak audit."/>
    {!batches.length && <Card>Belum ada import workbook lama.</Card>}
    {batches.map(b=>{const s=JSON.parse(String(b.summary));return <Card key={String(b.id)}><h2 className="text-xl font-semibold">{String(b.source_name)}</h2><p className="mt-2 text-slate-600">Ringkasan pada masa import: {s.families} keluarga · {s.members} ahli · {s.sourcePayments} baris bayaran sumber · {s.claims} bantuan.</p><div className="my-5 grid gap-4 sm:grid-cols-3"><div>Kutipan diterima<p className="text-2xl font-semibold">{formatRM(s.approvedCollections)}</p></div><div>Bantuan dibayar<p className="text-2xl font-semibold">{formatRM(s.disbursed)}</p></div><div>Baki buku ketika import<p className="text-2xl font-semibold">{formatRM(s.confirmedBookBalance)}</p></div></div><p className="mb-4 text-sm text-slate-600">Ini ringkasan migrasi, bukan pengesahan baki penyata bank. Semak ledger untuk baki terkini. Akaun wakil tersedia di Akaun & kuasa; gunakan reset untuk keluarkan kod pengaktifan apabila diperlukan.</p><div className="flex flex-wrap gap-4"><a className="action-link" href={`/api/legacy-review?id=${encodeURIComponent(String(b.id))}`}>Muat turun fail asal</a><Link className="action-link" href="/admin/fund">Ledger dana</Link><Link className="action-link" href="/admin/families">Keluarga</Link><Link className="action-link" href="/admin/users">Akaun wakil</Link></div></Card>})}
    {issues.map(i=><Card key={String(i.id)}><div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-semibold">{String(i.title)}</h2><span className={i.status==="Open"?"font-semibold text-amber-800":"font-semibold text-emerald-800"}>{i.status==="Open"?"Perlu semakan":"Selesai"}</span></div><p className="mt-3 text-slate-700">{String(i.detail)}</p>{i.resolution && <p className="mt-3 rounded-xl bg-emerald-50 p-3">{String(i.resolution)}</p>}{i.status==="Open" && <ReviewActions id={String(i.id)} kind={String(i.kind)}/>}</Card>)}
  </div>;
}
