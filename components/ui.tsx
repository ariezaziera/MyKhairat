import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary: "bg-brand-blue text-white hover:bg-[#0069d9]",
  green: "bg-brand-green text-white hover:bg-[#218838]",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  ghost: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-200/80 ${className}`}>{children}</section>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-200/80">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "danger" | "success"; children: ReactNode }) {
  const toneClass = {
    info: "bg-sky-50 text-sky-900 ring-sky-100",
    danger: "bg-rose-50 text-rose-900 ring-rose-100",
    success: "bg-emerald-50 text-emerald-900 ring-emerald-100",
  }[tone];
  return <div className={`rounded-2xl px-4 py-3 text-sm ring-1 ${toneClass}`}>{children}</div>;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-brand-blue hover:underline">
      {children}
    </Link>
  );
}
