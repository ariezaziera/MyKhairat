"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Card } from "@/components/ui";

export type AccountRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  familyId: string | null;
  familyLabel: string | null;
  phone: string | null;
  active: boolean;
};

export function AccountsBoard({ accounts, currentUserId }: { accounts: AccountRow[]; currentUserId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        phone: form.get("phone"),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not create the admin.");
      return;
    }
    event.currentTarget.reset();
    setNotice("Admin account created.");
    router.refresh();
  }

  async function patch(id: string, body: Record<string, unknown>, message: string) {
    setError("");
    setNotice("");
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not update the account.");
      return;
    }
    setNotice(message);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}
      <Card>
        <h2 className="text-lg font-semibold">Add AJK admin</h2>
        <p className="mt-1 text-sm text-slate-500">Extra admins can approve payments, edit families, and manage this QR and the fund settings.</p>
        <form onSubmit={createAdmin} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" required minLength={2} />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" />
          </div>
          <div>
            <label htmlFor="password">Temporary password</label>
            <input id="password" name="password" type="password" required minLength={6} />
          </div>
          <Button type="submit" className="sm:col-span-2 sm:w-fit" disabled={pending}>
            {pending ? "Creating..." : "Create admin"}
          </Button>
        </form>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        {accounts.map((account) => (
          <Card key={account.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{account.name}</p>
                <p className="text-sm text-slate-500">{account.email}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                  {account.role === "admin" ? "AJK admin" : `Wakil · ${account.familyId}`}
                  {account.familyLabel ? ` · ${account.familyLabel}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {account.active ? "Active login" : "Disabled"}
              </span>
            </div>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const password = String(form.get("password") ?? "");
                const name = String(form.get("name") ?? "");
                void patch(
                  account.id,
                  { name, password: password || undefined },
                  password ? "Password updated." : "Name updated.",
                );
              }}
            >
              <input name="name" defaultValue={account.name} required minLength={2} aria-label="Name" />
              <input name="password" type="password" minLength={6} placeholder="New password" aria-label="New password" />
              <Button type="submit" variant="ghost" className="sm:col-span-2 sm:w-fit">
                Save name or password
              </Button>
            </form>
            {account.id === currentUserId ? (
              <p className="text-xs text-slate-500">This is your login. Another admin must disable it.</p>
            ) : (
              <Button
                type="button"
                variant={account.active ? "danger" : "green"}
                className="w-full sm:w-fit"
                onClick={() =>
                  void patch(
                    account.id,
                    { active: !account.active },
                    account.active ? "Login disabled." : "Login enabled.",
                  )
                }
              >
                {account.active ? "Disable login" : "Enable login"}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
