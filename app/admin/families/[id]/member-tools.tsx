"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Card } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { formatRM } from "@/lib/format";

type Member = {
  memberId: string;
  memberName: string;
  memberStatus: string;
  relationship: string;
  eligible: boolean;
  eligibilityReason: string;
};

type Claim = { claimId: string; memberId: string; claimDate: string; claimType: string; amount: number; notes: string | null };

const relationships = ["Wakil", "Suami", "Isteri", "Anak", "Ibu", "Bapa", "Adik", "Lain-lain"];

export function MemberTools({
  familyId,
  members,
  claims,
  deathPayout,
  wardedPayout,
}: {
  familyId: string;
  members: Member[];
  claims: Claim[];
  deathPayout: number;
  wardedPayout: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [claimType, setClaimType] = useState<"Death" | "Warded">("Death");
  const [claimAmount, setClaimAmount] = useState(String(deathPayout));
  const eligible = members.filter((member) => member.eligible);

  async function send(url: string, method: string, body?: unknown) {
    setError("");
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Request failed.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await send("/api/members", "POST", {
      familyId,
      memberName: form.get("memberName"),
      relationship: form.get("relationship"),
      memberStatus: form.get("memberStatus"),
    });
    if (ok) event.currentTarget.reset();
  }

  async function saveMember(event: FormEvent<HTMLFormElement>, memberId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await send(`/api/members/${memberId}`, "PUT", {
      memberName: form.get("memberName"),
      relationship: form.get("relationship"),
      memberStatus: form.get("memberStatus"),
    });
  }

  async function recordClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await send("/api/claims", "POST", {
      familyId,
      memberId: form.get("memberId"),
      claimDate: form.get("claimDate"),
      claimType,
      amount: Number(form.get("amount")),
      notes: form.get("notes"),
    });
    if (ok) {
      event.currentTarget.reset();
      setClaimType("Death");
      setClaimAmount(String(deathPayout));
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-sm text-slate-500">Only an Aktif member in an Active family can receive khairat kematian or a critical warded claim.</p>
        {members.map((member) => (
          <form key={member.memberId} onSubmit={(event) => saveMember(event, member.memberId)} className="grid gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1fr_140px_140px_auto_auto]">
            <input name="memberName" defaultValue={member.memberName} />
            <select name="relationship" defaultValue={member.relationship}>
              {relationships.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select name="memberStatus" defaultValue={member.memberStatus}>
              <option>Aktif</option>
              <option>Tidak Aktif</option>
            </select>
            <Button type="submit" variant="ghost">
              Save
            </Button>
            <button
              type="button"
              className="text-sm font-semibold text-rose-600"
              onClick={() => {
                if (confirm(`Remove ${member.memberName}?`)) send(`/api/members/${member.memberId}`, "DELETE");
              }}
            >
              Delete
            </button>
            <p className="md:col-span-5 text-xs text-slate-500">
              <StatusPill status={member.eligible ? "Aktif" : "Tidak Aktif"} /> {member.eligibilityReason}
            </p>
          </form>
        ))}
        <form onSubmit={addMember} className="grid gap-2 md:grid-cols-[1fr_140px_140px_auto]">
          <input name="memberName" placeholder="New member name" required />
          <select name="relationship" defaultValue="Anak">
            {relationships.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select name="memberStatus" defaultValue="Aktif">
            <option>Aktif</option>
            <option>Tidak Aktif</option>
          </select>
          <Button type="submit">Add</Button>
        </form>
      </Card>
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Claim</h2>
        <p className="text-sm text-slate-500">
          Khairat kematian is {formatRM(deathPayout)}. A critical warded admission is {formatRM(wardedPayout)}. For a case from 2025, type the amount that was actually paid.
        </p>
        {eligible.length === 0 ? (
          <p className="text-sm text-slate-600">No member in this family can receive a payout right now.</p>
        ) : (
          <form onSubmit={recordClaim} className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="claimType">Claim type</label>
              <select
                id="claimType"
                name="claimType"
                value={claimType}
                onChange={(event) => {
                  const next = event.target.value === "Warded" ? "Warded" : "Death";
                  setClaimType(next);
                  setClaimAmount(String(next === "Death" ? deathPayout : wardedPayout));
                }}
              >
                <option value="Death">Khairat kematian</option>
                <option value="Warded">Masuk wad (critical)</option>
              </select>
            </div>
            <div>
              <label htmlFor="memberId">Eligible member</label>
              <select id="memberId" name="memberId" defaultValue={eligible[0]?.memberId}>
                {eligible.map((member) => (
                  <option key={member.memberId} value={member.memberId}>
                    {member.memberName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="claimDate">Claim date</label>
              <input id="claimDate" name="claimDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <label htmlFor="amount">Lump sum paid</label>
              <input id="amount" name="amount" type="number" min="1" step="0.01" required value={claimAmount} onChange={(event) => setClaimAmount(event.target.value)} />
              <p className="mt-1 text-xs text-slate-500">
                {claimType === "Death"
                  ? "Recording a death marks this member Tidak Aktif, so the family stops paying for that person."
                  : "A warded claim keeps the member Aktif. The family still pays for that head."}
              </p>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="notes">Notes</label>
              <input id="notes" name="notes" placeholder="Hospital, or who received the money" />
            </div>
            <Button type="submit" variant="green">
              Record payout
            </Button>
          </form>
        )}
        <ul className="space-y-2 text-sm">
          {claims.map((claim) => (
            <li key={claim.claimId} className="flex justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <span>
                {members.find((member) => member.memberId === claim.memberId)?.memberName ?? claim.memberId} · {claim.claimType === "Warded" ? "Masuk wad" : "Kematian"} · {claim.claimDate}
              </span>
              <span className="font-semibold">{formatRM(claim.amount)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
