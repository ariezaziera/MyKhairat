"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui";

type Initial = {
  familyId: string;
  wakilName: string;
  wakilPhone: string;
  email: string;
  familyStatus: string;
  joinedMonth: string;
  openingBalance: number;
  notes: string;
};

export function FamilyForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const editing = Boolean(initial);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      wakilName: form.get("wakilName"),
      wakilPhone: form.get("wakilPhone"),
      email: form.get("email"),
      password: form.get("password"),
      familyStatus: form.get("familyStatus"),
      joinedMonth: form.get("joinedMonth"),
      openingBalance: Number(form.get("openingBalance") || 0),
      notes: form.get("notes"),
    };
    const response = await fetch(editing ? `/api/families/${initial?.familyId}` : "/api/families", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not save the family.");
      return;
    }
    router.push(`/admin/families/${data.family.familyId}`);
    router.refresh();
  }

  async function remove() {
    if (!initial || !confirm(`Delete ${initial.familyId} and its members, payments, and login?`)) return;
    const response = await fetch(`/api/families/${initial.familyId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Could not delete the family.");
      return;
    }
    router.push("/admin/families");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-200">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="wakilName">Representative name</label>
          <input id="wakilName" name="wakilName" required defaultValue={initial?.wakilName} />
        </div>
        <div>
          <label htmlFor="wakilPhone">Phone</label>
          <input id="wakilPhone" name="wakilPhone" required defaultValue={initial?.wakilPhone} />
        </div>
        <div>
          <label htmlFor="email">Wakil email</label>
          <input id="email" name="email" type="email" required defaultValue={initial?.email} />
        </div>
        <div>
          <label htmlFor="password">{editing ? "New password (optional)" : "Password"}</label>
          <input id="password" name="password" type="password" minLength={editing ? undefined : 6} required={!editing} />
        </div>
        <div>
          <label htmlFor="joinedMonth">Joined month</label>
          <input id="joinedMonth" name="joinedMonth" type="month" required defaultValue={initial?.joinedMonth} />
          <p className="mt-1 text-xs text-slate-500">The month this family joined, including 2025. Months before this are not billed.</p>
        </div>
        <div>
          <label htmlFor="openingBalance">Baki awal</label>
          <input id="openingBalance" name="openingBalance" type="number" step="0.01" defaultValue={initial?.openingBalance ?? 0} />
          <p className="mt-1 text-xs text-slate-500">Arrears already owed when the family was entered. Record old collections separately.</p>
        </div>
        <div>
          <label htmlFor="familyStatus">Family status</label>
          <select id="familyStatus" name="familyStatus" defaultValue={initial?.familyStatus ?? "Active"}>
            <option>Active</option>
            <option>Suspended</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={initial?.notes} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : editing ? "Save changes" : "Create family"}
        </Button>
        {editing ? (
          <Button type="button" variant="danger" onClick={remove}>
            Delete family
          </Button>
        ) : null}
      </div>
    </form>
  );
}
