"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { EmptyState } from "@/components/empty-state";
import { useAdminPermission } from "@/components/admin-permissions";
import { api, uploadEvidence } from "@/lib/client-api";
import { formatRM, todayDate } from "@/lib/format";
export function ClaimsBoard({
  claims,
}: {
  claims: Record<string, string | number | null>[];
}) {
  const allowed = useAdminPermission("claims"),
    router = useRouter();
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  async function act(
    c: Record<string, string | number | null>,
    status: string,
  ) {
    const note = prompt(
      "Catatan semakan / alasan (sekurang-kurangnya 5 aksara)",
    );
    if (!note || note.length < 5) return;
    setBusy(String(c.claim_id));
    setError("");
    try {
      await api("/api/claims/" + c.claim_id, "PATCH", { status, note });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      {!claims.length && (
        <EmptyState
          title="Belum ada tuntutan"
          description="Buka keluarga berkenaan untuk memasukkan permohonan bantuan."
          action={
            <Link className="action-link" href="/admin/families">
              Pilih keluarga
            </Link>
          }
        />
      )}{" "}
      {claims.map((c) => (
        <Card key={String(c.claim_id)}>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <Link
                href={"/admin/families/" + c.family_id}
                className="font-semibold text-blue-800"
              >
                {c.wakil_name}
              </Link>
              <h2 className="mt-1 text-xl font-semibold">
                {c.member_name} ·{" "}
                {c.claim_type === "Death" ? "Kematian" : "Wad kritikal"}
              </h2>
              <p className="mt-2 text-slate-600">
                {c.claim_date} · {formatRM(Number(c.amount))}
              </p>
            </div>
            <StatusPill status={String(c.status)} />
          </div>
          <p className="mt-4 text-slate-600">
            Penerima: {c.recipient_name || "Rekod lama"} ·{" "}
            {c.recipient_account || "—"}
          </p>
          {c.evidence_url && (
            <a
              className="mt-3 inline-block font-semibold text-blue-800"
              href={String(c.evidence_url)}
              target="_blank"
              rel="noreferrer"
            >
              Lihat bukti kejadian →
            </a>
          )}
          {c.notes && (
            <p className="mt-3 whitespace-pre-wrap text-slate-600">{c.notes}</p>
          )}
          {allowed && c.status !== "Paid" && c.status !== "Rejected" && (
            <div className="mt-5 flex flex-wrap gap-3">
              {c.status === "Submitted" && (
                <Button
                  disabled={busy === c.claim_id}
                  onClick={() => void act(c, "Reviewed")}
                >
                  Sahkan semakan
                </Button>
              )}
              {c.status === "Reviewed" && (
                <Button
                  variant="green"
                  disabled={busy === c.claim_id}
                  onClick={() => void act(c, "Approved")}
                >
                  Luluskan bantuan
                </Button>
              )}
              <Button
                variant="danger"
                disabled={busy === c.claim_id}
                onClick={() => void act(c, "Rejected")}
              >
                Tolak dengan alasan
              </Button>
            </div>
          )}
          {allowed && c.status === "Approved" && (
            <form
              className="mt-5 grid gap-3 md:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setBusy(String(c.claim_id));
                try {
                  const file = f.get("proof");
                  if (!(file instanceof File) || !file.size)
                    throw new Error("Upload bukti payout.");
                  const receipt = await uploadEvidence(
                    String(c.family_id),
                    file,
                  );
                  await api("/api/claims/" + c.claim_id, "PATCH", {
                    status: "Paid",
                    note: f.get("note"),
                    paidDate: f.get("paidDate"),
                    reference: f.get("reference"),
                    receiptId: receipt.receiptId,
                  });
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Sambungan gagal.");
                } finally {
                  setBusy("");
                }
              }}
            >
              <label>
                Tarikh dibayar
                <input
                  name="paidDate"
                  type="date"
                  max={todayDate()}
                  defaultValue={todayDate()}
                  required
                />
              </label>
              <label>
                Rujukan payout
                <input name="reference" required minLength={3} />
              </label>
              <label>
                Bukti transfer
                <input
                  name="proof"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                />
              </label>
              <label>
                Catatan
                <input name="note" required minLength={5} />
              </label>
              <Button disabled={busy === c.claim_id}>
                Rekod sebagai dibayar
              </Button>
            </form>
          )}
          {c.status === "Paid" && (
            <p className="mt-4 text-sm text-slate-600">
              Dibayar {c.paid_date || c.claim_date} ·{" "}
              {c.payout_reference || "Rekod asal sebelum naik taraf"}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
