"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function RequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(decision: "Approved" | "Rejected") {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/member-requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Could not update the request.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={() => decide("Rejected")}>
          Reject
        </Button>
        <Button type="button" variant="green" disabled={busy} onClick={() => decide("Approved")}>
          Approve
        </Button>
      </div>
    </div>
  );
}
