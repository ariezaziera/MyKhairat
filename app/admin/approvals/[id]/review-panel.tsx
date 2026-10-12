"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui";
import { useAdminPermission } from "@/components/admin-permissions";
export function ReviewPanel({
  paymentId,
  pending,
}: {
  paymentId: string;
  pending: boolean;
}) {
  const router = useRouter(),
    allowed = useAdminPermission("approve");
  const [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function act(approved: boolean) {
    setBusy(true);
    setError("");
    try {
      await api(
        "/api/payments/" + paymentId + "/" + (approved ? "approve" : "reject"),
        "POST",
        approved ? undefined : { reason },
      );
      setMessage(
        approved
          ? "Resit disahkan. Kutipan dan rekod keluarga dikemaskini."
          : "Resit ditolak dengan alasan.",
      );
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Sambungan gagal. Semak status sebelum cuba semula.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!pending && !message) return null;
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">
          {message}
        </p>
      )}
      {pending && allowed && (
        <>
          <label htmlFor="rejection">
            Alasan jika menolak resit
            <textarea
              id="rejection"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Contoh: jumlah tidak sama dengan transaksi bank"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              disabled={busy || reason.trim().length < 3}
              onClick={() => void act(false)}
            >
              Tolak resit
            </Button>
            <Button
              variant="green"
              disabled={busy}
              onClick={() => void act(true)}
            >
              {busy ? "Menyimpan…" : "Sahkan wang diterima"}
            </Button>
          </div>
          <p className="text-sm text-slate-600">
            Semak penerima, jumlah dan rujukan terhadap transaksi bank sebelum
            meluluskan.
          </p>
        </>
      )}
      {pending && !allowed && (
        <p className="text-slate-600">
          Akaun ini boleh melihat resit. Kelulusan memerlukan pelulus /
          pentadbir utama.
        </p>
      )}
    </div>
  );
}
