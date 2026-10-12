"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/client-api";
import { useAdminPermission } from "@/components/admin-permissions";
export function RequestActions({ requestId }: { requestId: string }) {
  const router = useRouter(),
    allowed = useAdminPermission("families"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function act(decision: string) {
    setBusy(true);
    try {
      await api("/api/member-requests/" + requestId, "PATCH", { decision });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      {allowed && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void act("Rejected")}
          >
            Tolak
          </Button>
          <Button
            variant="green"
            disabled={busy}
            onClick={() => void act("Approved")}
          >
            Luluskan ahli
          </Button>
        </div>
      )}
    </div>
  );
}
