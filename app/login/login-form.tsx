"use client";

import { FormEvent, useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui";

export function LoginForm({ error }: { error?: string }) {
  const [message, setMessage] = useState(error ?? "");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          activationCode: form.get("activationCode") || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      setPending(false);
      if (!response.ok) {
        setMessage(data.error || "Could not sign in.");
        return;
      }
      window.location.assign(
        data.mustChangePassword
          ? "/change-password"
          : data.role === "admin"
            ? "/admin"
            : "/app",
      );
    } catch {
      setMessage("Sambungan gagal. Sila cuba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message ? (
        <p
          role="alert"
          className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {message}
        </p>
      ) : null}
      <div>
        <label htmlFor="email">Username atau email</label>
        <input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          required
          placeholder="Username wakil / email admin"
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <PasswordInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Password"
        />
      </div>
      <details className="rounded-xl border border-slate-200 p-3">
        <summary className="cursor-pointer font-medium text-slate-700">
          Login pertama / selepas reset
        </summary>
        <label htmlFor="activationCode" className="mt-3">
          Kod pengaktifan daripada AJK
        </label>
        <input
          id="activationCode"
          name="activationCode"
          autoComplete="one-time-code"
          maxLength={20}
          placeholder="Kod sah selama 7 hari"
        />
      </details>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sedang masuk…" : "Masuk"}
      </Button>
    </form>
  );
}
