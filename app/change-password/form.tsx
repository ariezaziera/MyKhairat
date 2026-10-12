"use client";
import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui";
export function ChangePasswordForm({ name }: { name: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError("Password baharu tidak sama.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          password: form.get("password"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
        return;
      }
      window.location.assign(data.role === "admin" ? "/admin" : "/app");
    } catch {
      setError("Sambungan gagal. Cuba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="w-full space-y-4 rounded-3xl bg-white p-6 shadow-card"
    >
      <h1 className="text-2xl font-semibold">Tukar password</h1>
      <p>{name}, sila tukar password sebelum meneruskan.</p>
      {error && (
        <p role="alert" className="text-rose-600">
          {error}
        </p>
      )}
      <label>
        Password semasa
        <PasswordInput
          name="currentPassword"
          required
          autoComplete="current-password"
        />
      </label>
      <label>
        Password baharu
        <PasswordInput
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <label>
        Ulang password baharu
        <PasswordInput
          name="confirm"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <Button disabled={busy} className="w-full">
        {busy ? "Menyimpan…" : "Simpan password"}
      </Button>
      <p className="text-sm text-slate-500">
        Lupa password? Hubungi admin untuk reset.
      </p>
    </form>
  );
}
