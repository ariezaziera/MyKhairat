"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";

const relationships = ["Anak", "Suami", "Isteri", "Ibu", "Bapa", "Adik", "Lain-lain"];

type Member = {
  memberId: string;
  memberName: string;
  memberStatus: string;
  relationship: string;
  eligible: boolean;
  eligibilityReason: string;
};

type RequestRow = { requestId: string; memberName: string; relationship: string; status: string };

export function DependentsClient({
  familyId,
  members,
  requests,
}: {
  familyId: string;
  members: Member[];
  requests: RequestRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/member-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId,
        memberName: form.get("memberName"),
        relationship: form.get("relationship"),
        note: form.get("note"),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not send the request.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Family Members</h1>
          <p className="text-sm text-slate-500">Dependents do not sign in. The AJK updates this list from your requests.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Request member
        </button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <li key={member.memberId} className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-card ring-1 ring-slate-200/70">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-brand-blue">
              {member.memberName.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{member.memberName}</p>
              <p className="text-xs text-slate-500">{member.relationship}</p>
              <p className="text-xs text-slate-400">{member.eligible ? "Eligible for khairat" : member.eligibilityReason}</p>
            </div>
            <StatusPill status={member.memberStatus} />
          </li>
        ))}
      </ul>
      {requests.length ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Add requests</h2>
          {requests.map((request) => (
            <div key={request.requestId} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
              <span>
                {request.memberName} · {request.relationship}
              </span>
              <StatusPill status={request.status} />
            </div>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <form onSubmit={onSubmit} className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Request a new member</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
            <div className="space-y-3">
              <div>
                <label htmlFor="memberName">Name</label>
                <input id="memberName" name="memberName" required />
              </div>
              <div>
                <label htmlFor="relationship">Relationship</label>
                <select id="relationship" name="relationship" defaultValue="Anak">
                  {relationships.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="note">Note</label>
                <textarea id="note" name="note" rows={3} placeholder="Optional note for the AJK" />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Sending..." : "Send request"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
