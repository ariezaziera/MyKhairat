"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { PageHeading } from "@/components/page-heading";
import { api } from "@/lib/client-api";
type Member = {
  memberId: string;
  memberName: string;
  memberStatus: string;
  relationship: string;
  eligible: boolean;
  eligibilityReason: string;
};
type RequestRow = {
  requestId: string;
  memberName: string;
  relationship: string;
  status: string;
};
export function DependentsClient({
  familyId,
  members,
  requests,
}: {
  familyId: string;
  members: Member[];
  requests: RequestRow[];
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  return (
    <div className="space-y-6">
      <PageHeading
        title="Ahli keluarga"
        description="Ahli tidak memerlukan akaun. Maklumkan perubahan melalui portal pilihan atau WhatsApp kepada AJK."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => (
          <Card key={m.memberId}>
            <div className="flex gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 font-semibold text-blue-800">
                {m.memberName.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <h2 className="break-words text-lg font-semibold">
                  {m.memberName}
                </h2>
                <p className="mt-1 text-slate-600">{m.relationship}</p>
                <div className="mt-3">
                  <StatusPill status={m.memberStatus} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <details>
          <summary className="cursor-pointer text-lg font-semibold text-blue-800">
            Mohon tambah ahli
          </summary>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form);
              setBusy(true);
              setError("");
              try {
                await api("/api/member-requests", "POST", {
                  familyId,
                  memberName: f.get("name"),
                  relationship: f.get("relationship"),
                  note: f.get("note"),
                });
                setNotice("Permohonan diterima. AJK akan menyemak.");
                form.reset();
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Sambungan gagal.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Nama ahli
              <input name="name" required minLength={2} />
            </label>
            <label>
              Hubungan
              <select name="relationship">
                {[
                  "Anak",
                  "Suami",
                  "Isteri",
                  "Ibu",
                  "Bapa",
                  "Adik",
                  "Lain-lain",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              Catatan
              <input name="note" maxLength={300} />
            </label>
            <Button disabled={busy}>
              {busy ? "Menghantar…" : "Hantar permohonan"}
            </Button>
          </form>
        </details>
        {error && (
          <p role="alert" className="mt-4 text-rose-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 text-green-800">
            {notice}
          </p>
        )}
      </Card>
      {requests.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold">Status permohonan</h2>
          {requests.map((r) => (
            <div
              key={r.requestId}
              className="mt-4 flex flex-wrap justify-between gap-3"
            >
              <p>
                {r.memberName} · {r.relationship}
              </p>
              <StatusPill status={r.status} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
