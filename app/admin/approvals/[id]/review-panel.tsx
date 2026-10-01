"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function ReviewPanel({ paymentId, pending }: { paymentId: string; pending: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/payments/${paymentId}/approve`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Could not approve.");
      return;
    }
    const balance = data.balance;
    setMessage(
      balance
        ? `Approved. Baki semasa is now RM ${Number(balance.bakiSemasa).toFixed(2)}. Family status: ${balance.familyStatus}.`
        : "Approved.",
    );
    router.refresh();
  }

  async function reject() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/payments/${paymentId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Could not reject.");
      return;
    }
    setMessage("Payment rejected.");
    router.refresh();
  }

  if (!pending && !message) return null;
  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
      {pending ? (
        <>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Rejection reason, if you are rejecting this payment" />
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="danger" disabled={busy} onClick={reject}>
              Reject
            </Button>
            <Button type="button" variant="green" disabled={busy} onClick={approve}>
              Approve
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
