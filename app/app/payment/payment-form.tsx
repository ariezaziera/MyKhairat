"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { formatMonth, formatRM } from "@/lib/format";

type MonthOption = { month: string; state: string; outstanding: number };

export function PaymentForm({
  familyId,
  dues,
  bankName,
  bankAccountName,
  bankAccountNumber,
  paymentMethod,
  duitnowId,
  hasDuitnowQr,
  months,
  inactive,
}: {
  familyId: string;
  dues: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentMethod: string;
  duitnowId: string;
  hasDuitnowQr: boolean;
  months: MonthOption[];
  inactive: boolean;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(months[0]?.month ?? "");
  const selected = useMemo(() => months.find((item) => item.month === month), [month, months]);
  const [amount, setAmount] = useState(String(selected?.outstanding || dues));
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function chooseMonth(value: string) {
    setMonth(value);
    const next = months.find((item) => item.month === value);
    setAmount(String(next?.outstanding || dues));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inactive) return;
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const file = form.get("receipt");
    if (!(file instanceof File) || !file.size) {
      setPending(false);
      setError("Upload the payment receipt.");
      return;
    }
    if (file.size > 2_000_000) {
      setPending(false);
      setError("Receipt must be under 2MB.");
      return;
    }
    const dataUrl = await readFile(file);
    const uploaded = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId, dataUrl }),
    });
    const uploadData = await uploaded.json().catch(() => ({}));
    if (!uploaded.ok) {
      setPending(false);
      setError(uploadData.error || "Could not save the receipt.");
      return;
    }
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId,
        paymentMonthYear: month,
        amountPaid: Number(amount),
        transactionReference: form.get("reference"),
        receiptId: uploadData.receiptId,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not submit the payment.");
      return;
    }
    router.push("/app/ledger");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Submit Payment</h1>
        <p className="text-sm text-slate-500">Log Masuk Duit. A payment is complete only after the AJK verifies the reference and receipt.</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 space-y-4 lg:order-1">
          {inactive ? <p className="rounded-2xl bg-slate-100 px-3 py-2 text-sm">This family is inactive and cannot submit payments.</p> : null}
          {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="month">Select Month</label>
              <select id="month" value={month} onChange={(event) => chooseMonth(event.target.value)} disabled={inactive}>
                {months.map((item) => (
                  <option key={item.month} value={item.month}>
                    {formatMonth(item.month)} · {item.state}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="amount">Amount</label>
              <input id="amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={inactive} />
              {selected && Math.abs(Number(amount) - dues) > 0.001 ? (
                <p className="mt-1 text-xs text-amber-700">The calculated monthly dues are {formatRM(dues)}.</p>
              ) : null}
            </div>
          </div>
          <div>
            <label htmlFor="reference">Transaction reference</label>
            <input id="reference" name="reference" required minLength={4} placeholder="Bank or QR reference" disabled={inactive} />
          </div>
          <div>
            <label htmlFor="receipt">Upload Receipt Image</label>
            <label htmlFor="receipt" className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
              {preview ? <img src={preview} alt="Receipt preview" className="max-h-56 rounded-xl object-contain" /> : "Tap to upload the QR or transfer screenshot"}
              <input
                id="receipt"
                name="receipt"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={inactive}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setPreview(URL.createObjectURL(file));
                }}
              />
            </label>
          </div>
          <Button type="submit" className="w-full py-4 text-base sm:w-auto sm:px-8" disabled={pending || inactive}>
            {pending ? "Submitting..." : "Submit"}
          </Button>
        </div>
        <Card className="order-1 lg:sticky lg:top-24 lg:order-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{paymentMethod}</p>
          <p className="mt-2 text-lg font-semibold">{bankAccountName}</p>
          <p className="text-sm text-slate-600">
            {bankName} · {bankAccountNumber}
          </p>
          {hasDuitnowQr ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-3">
              <img src="/api/duitnow/qr" alt="DuitNow QR" className="mx-auto w-full max-w-[240px] object-contain" />
              {duitnowId ? <p className="mt-2 text-center text-sm font-semibold">DuitNow ID {duitnowId}</p> : null}
              <p className="mt-1 text-center text-xs text-slate-500">Scan this code, then upload the receipt.</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">The AJK has not uploaded a DuitNow QR yet. Transfer to the account above.</p>
          )}
          <p className="mt-4 text-sm text-slate-500">Expected this month</p>
          <p className="text-2xl font-semibold text-brand-green">{formatRM(dues)}</p>
        </Card>
      </div>
    </form>
  );
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the receipt."));
    reader.readAsDataURL(file);
  });
}
