"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Card } from "@/components/ui";
import { formatMonth, todayDate } from "@/lib/format";

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
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const payable = months.filter((item) => item.state !== "Upcoming");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/payments/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId,
        paymentMonthYear: form.get("paymentMonthYear"),
        amountPaid: Number(form.get("amountPaid")),
        transactionReference: form.get("transactionReference"),
        paymentDate: form.get("paymentDate"),
        markApproved: form.get("markApproved") === "on",
        entryNote: form.get("entryNote"),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not record the payment.");
      return;
    }
    event.currentTarget.reset();
    setNotice(data.approvalStatus === "Approved" ? "Payment recorded and approved. Baki semasa has been recalculated." : "Payment recorded as pending.");
    router.refresh();
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Record a payment</h2>
      <p className="mt-1 text-sm text-slate-500">Use this for cash, and for collections already made since 2025 before this system. Set the family’s joined month first, then record each old month as approved.</p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">{error}</p> : null}
        {notice ? <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:col-span-2">{notice}</p> : null}
        <div>
          <label htmlFor="paymentMonthYear">Month</label>
          <select id="paymentMonthYear" name="paymentMonthYear" required defaultValue={payable[0]?.month}>
            {payable.map((item) => (
              <option key={item.month} value={item.month}>
                {formatMonth(item.month)} · {item.state}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="amountPaid">Amount</label>
          <input id="amountPaid" name="amountPaid" inputMode="decimal" required defaultValue={suggested} />
        </div>
        <div>
          <label htmlFor="paymentDate">Date received</label>
          <input id="paymentDate" name="paymentDate" type="date" required defaultValue={todayDate()} />
        </div>
        <div>
          <label htmlFor="transactionReference">Reference</label>
          <input id="transactionReference" name="transactionReference" required minLength={2} placeholder="Cash, counter, or bank ref" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="entryNote">Note</label>
          <input id="entryNote" name="entryNote" placeholder="Optional note for the ledger" />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
          <input name="markApproved" type="checkbox" defaultChecked className="!h-4 !w-4 !rounded !p-0" />
          Approve immediately
        </label>
        <Button type="submit" className="sm:col-span-2 sm:w-fit" disabled={pending || payable.length === 0}>
          {pending ? "Saving..." : "Record payment"}
        </Button>
      </form>
    </Card>
  );
}
