"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { Card, Button } from "@/components/ui";
import { formatRM, todayDate } from "@/lib/format";
import { useAdminPermission } from "@/components/admin-permissions";
export function FundBoard({
  balance,
  hasOpening,
  entries,
  reconciliations,
}: {
  balance: number;
  hasOpening: boolean;
  entries: Record<string, string | number>[];
  reconciliations: Record<string, string | number>[];
}) {
  const router = useRouter(),
    allowed = useAdminPermission("settings");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/fund", "POST", {
        kind: f.get("kind"),
        date: f.get("date"),
        amount: Number(f.get("amount")),
        reference: f.get("reference"),
        note: f.get("note"),
      });
      setMessage("Rekod disimpan dengan jejak audit.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="hero-panel">
        <p className="eyebrow">Baki buku dana</p>
        <p className="text-4xl font-semibold">{formatRM(balance)}</p>
        {!hasOpening && (
          <p className="mt-3 text-amber-900">
            Baki bank asal belum disahkan. Baki ini belum mewakili semua
            transaksi sebelum sistem.
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-green-800">
          {message}
        </p>
      )}
      {allowed && (
        <Card>
          <h2 className="text-xl font-semibold">
            Rekod ledger / banding baki bank
          </h2>
          <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              Jenis
              <select name="kind">
                <option value="Opening" disabled={hasOpening}>
                  Baki bank asal
                </option>
                <option value="Donation">Derma</option>
                <option value="Expense">Perbelanjaan</option>
                <option value="Adjustment">Pelarasan (+/−)</option>
                <option value="Refund">Bayaran dipulangkan</option>
                <option value="Reconcile">Banding baki penyata bank</option>
              </select>
            </label>
            <label>
              Tarikh
              <input
                name="date"
                type="date"
                required
                max={todayDate()}
                defaultValue={todayDate()}
              />
            </label>
            <label>
              Jumlah RM
              <input name="amount" type="number" step="0.01" required />
            </label>
            <label>
              Rujukan
              <input name="reference" minLength={3} required />
            </label>
            <label className="md:col-span-2">
              Alasan / sumber pengesahan
              <textarea name="note" minLength={5} required rows={2} />
            </label>
            <Button disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan rekod"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-slate-600">
            Baki asal mesti pada tarikh sebelum kutipan pertama yang dimasukkan.
            Pelarasan tidak memadam transaksi asal.
          </p>
        </Card>
      )}
      <Card>
        <h2 className="text-xl font-semibold">Transaksi dana tambahan</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="py-3">Tarikh</th>
                <th>Jenis</th>
                <th>Rujukan</th>
                <th>Jumlah RM</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={String(e.id)} className="border-t border-slate-200">
                  <td className="py-3 pr-3">{e.date}</td>
                  <td className="pr-3">{e.kind}</td>
                  <td className="pr-3">{e.reference}</td>
                  <td className="pr-3 whitespace-nowrap">
                    {formatRM(Number(e.amount))}
                  </td>
                  <td>{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!entries.length && (
            <p className="py-5 text-slate-600">
              Belum ada rekod ledger tambahan.
            </p>
          )}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Semakan baki bank</h2>
        {reconciliations.map((r) => (
          <div key={String(r.id)} className="mt-4 rounded-xl bg-slate-50 p-4">
            <p>
              {r.date} · Bank {formatRM(Number(r.bank_balance))} · Buku{" "}
              {formatRM(Number(r.book_balance))}
            </p>
            <p className="mt-1 font-semibold">
              Beza {formatRM(Number(r.bank_balance) - Number(r.book_balance))}
            </p>
            <p className="mt-2 text-slate-600">{r.note}</p>
          </div>
        ))}
        {!reconciliations.length && (
          <p className="mt-4 text-slate-600">
            Belum dibanding dengan penyata bank.
          </p>
        )}
      </Card>
    </div>
  );
}
