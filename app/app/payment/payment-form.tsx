"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Card } from "@/components/ui";
import { PageHeading } from "@/components/page-heading";
import { api, uploadEvidence } from "@/lib/client-api";
import { formatMonth, formatRM } from "@/lib/format";
type MonthOption = { month: string; state: string; outstanding: number };
export function PaymentForm({
  familyId,
  bankName,
  bankVerified = false,
  bankAccountName,
  bankAccountNumber,
  hasDuitnowQr,
  months,
  inactive,
}: {
  familyId: string;
  dues: number;
  bankName: string;
  bankVerified?: boolean;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentMethod: string;
  duitnowId: string;
  hasDuitnowQr: boolean;
  months: MonthOption[];
  inactive: boolean;
}) {
  const router = useRouter();
  const payable = months.filter(
    (m) =>
      m.outstanding > 0 &&
      !["Paid", "Pending", "Upcoming", "BeforeJoin"].includes(m.state),
  );
  const [month, setMonth] = useState(payable[0]?.month || ""),
    [amount, setAmount] = useState(String(payable[0]?.outstanding ?? 0)),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget),
        file = f.get("receipt");
      if (!(file instanceof File) || !file.size)
        throw new Error("Pilih imej resit dahulu.");
      const r = await uploadEvidence(familyId, file);
      await api("/api/payments", "POST", {
        familyId,
        paymentMonthYear: month,
        amountPaid: Number(amount),
        transactionReference: f.get("reference"),
        receiptId: r.receiptId,
      });
      router.push("/app/ledger?submitted=1");
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
    <div className="space-y-6">
      <PageHeading
        title="Hantar bukti bayaran"
        description="Anda juga boleh menghantar resit terus kepada AJK melalui WhatsApp."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <p className="eyebrow">Langkah 1 · Bayar melalui bank</p>
          {!bankVerified && (
            <p className="rounded-xl bg-amber-50 p-4 text-amber-900">
              Maklumat penerima belum disahkan AJK. Ikut arahan dalam kumpulan
              WhatsApp keluarga. Bukti bayaran yang telah dibuat boleh dihantar
              melalui borang ini.
            </p>
          )}
          {bankVerified && (
            <>
              <h2 className="text-xl font-semibold">{bankAccountName}</h2>
              <p className="mt-3 text-slate-600">{bankName}</p>
              <p className="mt-1 break-all text-xl font-semibold">
                {bankAccountNumber}
              </p>
              <button
                type="button"
                className="secondary-link mt-4"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(bankAccountNumber);
                    setCopied(true);
                  } catch {
                    setError(
                      "Tidak dapat salin. Pilih nombor akaun dan salin secara manual.",
                    );
                  }
                }}
              >
                {copied ? "Nombor disalin" : "Salin nombor akaun"}
              </button>
            </>
          )}
          {hasDuitnowQr && bankVerified && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <img
                src="/api/duitnow/qr"
                alt="Kod QR DuitNow penerima"
                className="mx-auto w-full max-w-64"
              />
              <a
                href="/api/duitnow/qr?download=1"
                download="duitnow-mykhairat.png"
                className="secondary-link mt-4 w-full"
              >
                Simpan imej QR
              </a>
              <p className="mt-3 text-sm text-slate-600">
                Jika aplikasi bank menyokongnya, import imej QR dari galeri.
                Atau gunakan pindahan ke nombor akaun di atas.
              </p>
            </div>
          )}
          <div className="mt-5 rounded-xl bg-blue-50 p-4">
            <p className="font-semibold text-blue-900">
              Langkah 2 · Simpan resit
            </p>
            <p className="mt-2 text-slate-700">
              Selepas membayar, simpan screenshot transaksi. Semak penerima dan
              jumlah sebelum mengesahkan di aplikasi bank.
            </p>
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Langkah 3 · Hantar untuk semakan</p>
          {!payable.length || inactive ? (
            <p className="mt-4 text-slate-600">
              {inactive
                ? "Keluarga tidak aktif. Hubungi AJK."
                : "Tiada bulan yang boleh dibayar sekarang. Semak rekod atau tunggu semakan AJK."}
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 p-4 text-rose-800"
                >
                  {error}
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
                  {payable.map((m) => (
                    <option key={m.month} value={m.month}>
                      {formatMonth(m.month)} · Baki {formatRM(m.outstanding)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Jumlah yang dibayar RM
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </label>
              <label>
                Rujukan transaksi
                <input
                  name="reference"
                  minLength={4}
                  maxLength={64}
                  required
                  placeholder="Rujukan pada resit bank"
                />
              </label>
              <label>
                Imej resit
                <input
                  name="receipt"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setPreview(file ? URL.createObjectURL(file) : "");
                  }}
                />
                <span className="mt-2 block text-sm text-slate-600">
                  PNG/JPG/WebP bawah 2MB.
                </span>
              </label>
              {preview && (
                <img
                  src={preview}
                  alt="Preview resit yang dipilih"
                  className="max-h-72 rounded-xl object-contain"
                />
              )}
              <Button className="w-full" disabled={busy}>
                {busy ? "Menghantar…" : "Hantar bukti kepada AJK"}
              </Button>
              <p className="text-sm text-slate-600">
                Bukti akan berstatus Menunggu semakan. Ia dikira sebagai caruman
                selepas AJK mengesahkan.
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
