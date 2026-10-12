"use client";
import { useState } from "react";
import { Card, Button } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatRM } from "@/lib/format";
type Row = {
  familyId: string;
  date: string;
  month: string;
  amount: number;
  reference: string;
  expected?: number;
  count?: number;
};
export function TransactionImport() {
  const [rows, setRows] = useState<Row[]>([]),
    [errors, setErrors] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [total, setTotal] = useState(0);
  return (
    <Card>
      <p className="leading-7 text-slate-600">
        Kolum wajib: Family ID, Tarikh, Bulan, Jumlah, Rujukan. Tarikh
        YYYY-MM-DD, bulan YYYY-MM. Pilihan: Caruman Sebenar dan Bilangan Ahli
        untuk mengesahkan assessment sejarah. Maksimum500 baris, .xlsx/CSV
        bawah3MB.
      </p>
      <label className="mt-5">
        Fail transaksi
        <input
          type="file"
          accept=".xlsx,.csv"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setErrors([]);
            setRows([]);
            setNotice("");
            try {
              const form = new FormData();
              form.set("file", file);
              const r = await api<{
                rows: Row[];
                errors: string[];
                total: number;
              }>("/api/import/transactions", "POST", form);
              setRows(r.rows);
              setErrors(r.errors);
              setTotal(r.total);
            } catch (e) {
              setErrors([e instanceof Error ? e.message : "Sambungan gagal."]);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {errors.map((e, i) => (
        <p key={i} role="alert" className="mt-3 text-rose-700">
          {e}
        </p>
      ))}
      {rows.length > 0 && (
        <>
          <h2 className="mt-6 text-xl font-semibold">
            Preview: {rows.length} transaksi · {formatRM(total)}
          </h2>
          <div className="mt-4 max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">Keluarga</th>
                  <th>Tarikh</th>
                  <th>Bulan</th>
                  <th>Jumlah</th>
                  <th>Rujukan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="p-2">{r.familyId}</td>
                    <td>{r.date}</td>
                    <td>{r.month}</td>
                    <td>{formatRM(r.amount)}</td>
                    <td>{r.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const f = new FormData(e.currentTarget);
              try {
                await api("/api/import/transactions", "POST", {
                  rows,
                  confirm: true,
                  note: f.get("note"),
                });
                setNotice(
                  "Import berjaya: " +
                    rows.length +
                    " transaksi, " +
                    formatRM(total) +
                    ".",
                );
                setRows([]);
              } catch (e) {
                setErrors([
                  e instanceof Error
                    ? e.message
                    : "Sambungan gagal. Semak rekod sebelum mengulang import.",
                ]);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Sumber / pengesahan AJK
              <input
                name="note"
                minLength={10}
                required
                placeholder="Contoh: Disahkan daripada penyata bank Jan–Dis2025"
              />
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" required className="!w-5 !p-0" />
              Saya mengesahkan jumlah batch dengan sumber asal dan transaksi ini
              belum dikira dalam baki bank cutover.
            </label>
            <Button disabled={busy || errors.length > 0}>
              {busy ? "Mengimport…" : "Sahkan import " + formatRM(total)}
            </Button>
          </form>
        </>
      )}
      {notice && (
        <p role="status" className="mt-5 text-green-800">
          {notice}
        </p>
      )}
    </Card>
  );
}
