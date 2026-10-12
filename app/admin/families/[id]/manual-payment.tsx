"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card } from "@/components/ui";
import { api, uploadEvidence } from "@/lib/client-api";
import { formatMonth, todayDate, formatRM } from "@/lib/format";
import { useAdminPermission } from "@/components/admin-permissions";
type MonthOption = { month: string; state: string; outstanding: number };
export function ManualPayment({
  familyId,
  months,
  suggested,
}: {
  familyId: string;
  months: MonthOption[];
  suggested: number;
}) {
  const router = useRouter(),
    approve = useAdminPermission("approve");
  const payable = months.filter(
    (m) => m.outstanding > 0 && !["Upcoming", "Pending"].includes(m.state),
  );
  const [month, setMonth] = useState(payable[0]?.month || ""),
    [amount, setAmount] = useState(
      String(payable[0]?.outstanding ?? suggested),
    ),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const f = new FormData(e.currentTarget);
    try {
      const file = f.get("receipt");
      const receipt =
        file instanceof File && file.size
          ? await uploadEvidence(familyId, file)
          : null;
      const result = await api<{ approvalStatus: string }>(
        "/api/payments/manual",
        "POST",
        {
          familyId,
          paymentMonthYear: month,
          amountPaid: Number(amount),
          transactionReference: f.get("reference"),
          paymentDate: f.get("date"),
          markApproved: approve && f.get("approved") === "on",
          entryNote: f.get("note"),
          receiptId: receipt?.receiptId,
        },
      );
      setNotice(
        result.approvalStatus === "Approved"
          ? "Bayaran direkod dan disahkan."
          : "Resit direkod; menunggu semakan AJK.",
      );
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Sambungan gagal. Semak rekod sebelum cuba semula.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2 className="text-xl font-semibold">Resit WhatsApp / bayaran manual</h2>
      <p className="mt-2 leading-7 text-slate-600">
        Upload resit yang diterima daripada wakil. Tarikh ialah bila wang
        diterima, bulan ialah caruman yang dibayar. Lebihan dikira sebagai
        kredit untuk bulan tertunggak paling awal.
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        {error && (
          <p role="alert" className="text-rose-700 sm:col-span-2">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-green-800 sm:col-span-2">
            {notice}
          </p>
        )}
        <label>
          Bulan caruman
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setAmount(
                String(
                  payable.find((m) => m.month === e.target.value)
                    ?.outstanding ?? 0,
                ),
              );
            }}
            required
          >
            <option value="">Pilih bulan</option>
            {payable.map((m) => (
              <option key={m.month} value={m.month}>
                {formatMonth(m.month)} · Baki {formatRM(m.outstanding)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Jumlah diterima RM
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          Tarikh wang diterima
          <input
            name="date"
            type="date"
            max={todayDate()}
            defaultValue={todayDate()}
            required
          />
        </label>
        <label>
          Rujukan bank / resit tunai
          <input
            name="reference"
            minLength={2}
            maxLength={64}
            required
            placeholder="Rujukan unik transaksi"
          />
        </label>
        <label className="sm:col-span-2">
          Imej resit
          <input
            name="receipt"
            type="file"
            accept="image/png,image/jpeg,image/webp"
          />
          <span className="mt-1 block text-sm text-slate-600">
            PNG/JPG/WebP bawah 2MB. Bayaran tunai boleh direkod dengan rujukan
            resit dan catatan.
          </span>
        </label>
        <label className="sm:col-span-2">
          Catatan / sumber
          <input
            name="note"
            maxLength={300}
            placeholder="Contoh: diterima di WhatsApp kumpulan keluarga"
          />
        </label>
        {approve && (
          <label className="flex items-center gap-3 sm:col-span-2">
            <input name="approved" type="checkbox" className="!w-5 !p-0" />
            Saya telah semak resit dan wang diterima. Sahkan sekarang.
          </label>
        )}
        <Button disabled={busy || !month} className="sm:w-fit">
          {busy ? "Menyimpan…" : "Simpan rekod bayaran"}
        </Button>
        {!payable.length && (
          <p className="text-slate-600 sm:col-span-2">
            Tiada bulan berbaki. Semak pengesahan sejarah jika rekod lama belum
            tepat.
          </p>
        )}
      </form>
    </Card>
  );
}
