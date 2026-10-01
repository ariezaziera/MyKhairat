"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCheck,
  FileText,
  FolderKanban,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Receipt,
  Settings,
  Shield,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "./logo";

type Item = { href: string; label: string; icon: typeof Home; exact?: boolean };

const wakilItems: Item[] = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/dependents", label: "Members", icon: Users },
  { href: "/app/payment", label: "Pay", icon: Wallet },
  { href: "/app/ledger", label: "Ledger", icon: Receipt },
  { href: "/app/statement", label: "Statement", icon: FileText },
];

const adminItems: Item[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/approvals", label: "Approvals", icon: CheckCheck },
  { href: "/admin/families", label: "Directory", icon: FolderKanban },
  { href: "/admin/duitnow", label: "DuitNow", icon: QrCode },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/arrears", label: "Arrears", icon: AlertTriangle },
  { href: "/admin/requests", label: "Requests", icon: UserPlus },
  { href: "/admin/users", label: "Accounts", icon: Shield },
  { href: "/admin/activity", label: "Activity", icon: History },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, item: Item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function LogoutButton({ light = false }: { light?: boolean }) {
  const router = useRouter();
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${light ? "text-white/90 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"}`}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" />
      Log out
    </button>
  );
}

function NavLinks({ items, pathname, onNavigate }: { items: Item[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium ${active ? "bg-blue-50 text-brand-blue" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AppShell({
  name,
  role,
  detail,
  items,
  children,
}: {
  name: string;
  role: string;
  detail: string;
  items: Item[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const mobileItems = items.length > 5 ? items.slice(0, 4) : items;
  const hasMore = items.length > mobileItems.length;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
        <Logo />
        <p className="mb-3 mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{role}</p>
        <NavLinks items={items} pathname={pathname} />
        <div className="mt-auto rounded-2xl bg-slate-50 p-3">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">{detail}</p>
          <div className="-ml-2 mt-2">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-900/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[min(100%,300px)] flex-col bg-white px-4 py-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Logo compact />
              <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{role}</p>
            <NavLinks items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <button className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 lg:text-base">{role}</p>
            <p className="truncate text-xs text-slate-500">{detail}</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{name}</p>
            </div>
            <LogoutButton />
          </div>
          <div className="sm:hidden">
            <LogoutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden">
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${mobileItems.length + (hasMore ? 1 : 0)}, minmax(0, 1fr))` }}>
            {mobileItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${active ? "text-brand-blue" : "text-slate-400"}`}>
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {hasMore ? (
              <li>
                <button className="flex w-full flex-col items-center gap-1 py-2 text-[11px] font-medium text-slate-400" onClick={() => setOpen(true)}>
                  <Menu className="h-5 w-5" />
                  More
                </button>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function WakilShell({ name, familyId, children }: { name: string; familyId: string; children: ReactNode }) {
  return (
    <AppShell name={name} role="Family portal" detail={familyId} items={wakilItems}>
      {children}
    </AppShell>
  );
}

export function AdminShell({ name, children }: { name: string; children: ReactNode }) {
  return (
    <AppShell name={name} role="AJK admin" detail="Khairat Kematian fund" items={adminItems}>
      {children}
    </AppShell>
  );
}
