"use client";
import {
  AlertTriangle,
  BarChart3,
  CheckCheck,
  FileText,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  QrCode,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "./logo";
import { TextSizeControl } from "./text-size-control";
import { can, type Permission } from "@/lib/permissions";
type Item = {
  href: string;
  label: string;
  icon: typeof Home;
  group: string;
  permission?: Permission;
};
const wakilItems: Item[] = [
  { href: "/app", label: "Utama", icon: Home, group: "Keluarga" },
  { href: "/app/payment", label: "Bayaran", icon: Wallet, group: "Keluarga" },
  {
    href: "/app/dependents",
    label: "Ahli keluarga",
    icon: Users,
    group: "Keluarga",
  },
  { href: "/app/ledger", label: "Rekod", icon: History, group: "Keluarga" },
  {
    href: "/app/help",
    label: "Bantuan",
    icon: MessageCircle,
    group: "Keluarga",
  },
  {
    href: "/app/statement",
    label: "Penyata",
    icon: FileText,
    group: "Keluarga",
  },
];
const adminItems: Item[] = [
  { href: "/admin/import-review", label: "Semakan import", icon: FileText, group: "Pentadbiran", permission: "settings" },
  {
    href: "/admin",
    label: "Ringkasan",
    icon: LayoutDashboard,
    group: "Kerja hari ini",
  },
  {
    href: "/admin/approvals",
    label: "Semak resit",
    icon: CheckCheck,
    group: "Kerja hari ini",
  },
  {
    href: "/admin/payments/new",
    label: "Resit WhatsApp",
    icon: MessageCircle,
    group: "Kerja hari ini",
    permission: "payments",
  },
  {
    href: "/admin/families",
    label: "Keluarga",
    icon: Users,
    group: "Keluarga",
  },
  {
    href: "/admin/requests",
    label: "Permohonan ahli",
    icon: Users,
    group: "Keluarga",
  },
  {
    href: "/admin/claims",
    label: "Tuntutan bantuan",
    icon: Shield,
    group: "Kewangan",
  },
  {
    href: "/admin/fund",
    label: "Ledger & bank",
    icon: Wallet,
    group: "Kewangan",
  },
  {
    href: "/admin/reports",
    label: "Laporan",
    icon: BarChart3,
    group: "Kewangan",
  },
  {
    href: "/admin/arrears",
    label: "Tunggakan",
    icon: AlertTriangle,
    group: "Kewangan",
  },
  {
    href: "/admin/duitnow",
    label: "DuitNow",
    icon: QrCode,
    group: "Pentadbiran",
    permission: "settings",
  },
  {
    href: "/admin/users",
    label: "Akaun & kuasa",
    icon: Shield,
    group: "Pentadbiran",
    permission: "accounts",
  },
  {
    href: "/admin/activity",
    label: "Jejak audit",
    icon: History,
    group: "Pentadbiran",
  },
  {
    href: "/admin/backup",
    label: "Sandaran data",
    icon: FileText,
    group: "Pentadbiran",
    permission: "accounts",
  },
  {
    href: "/admin/settings",
    label: "Persetujuan",
    icon: Settings,
    group: "Pentadbiran",
    permission: "settings",
  },
];
function active(path: string, item: Item) {
  return item.href === "/app" || item.href === "/admin"
    ? path === item.href
    : path === item.href || path.startsWith(item.href + "/");
}
function Logout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="accessibility-control"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await fetch("/api/auth/logout", { method: "POST" });
          if (r.ok) {
            router.push("/login");
            router.refresh();
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <LogOut size={18} />
      <span className="hidden sm:inline">Keluar</span>
    </button>
  );
}
function Shell({
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
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const nodes = () =>
      Array.from(
        drawer.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled])",
        ) ?? [],
      );
    nodes()[0]?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key === "Tab") {
        const n = nodes(),
          first = n[0],
          last = n[n.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [open]);
  const links = () =>
    [...new Set(items.map((i) => i.group))].map((group) => (
      <div key={group} className="mb-5">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {group}
        </p>
        <nav aria-label={group} className="space-y-1">
          {items
            .filter((i) => i.group === group)
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active(path, item) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active(path, item) ? "bg-blue-50 text-blue-800 ring-1 ring-blue-100" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  <Icon size={19} />
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </div>
    ));
  const mobile = items.slice(0, role === "Portal keluarga" ? 5 : 4);
  const current = items.find((i) => active(path, i));
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-xl bg-white p-3 text-blue-800 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Langkau ke kandungan
      </a>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="px-6 pb-7 pt-8">
          <Logo />
          <p className="mt-3 text-sm text-slate-600">{role}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3">{links()}</div>
        <div className="border-t border-slate-200 p-5">
          <p className="break-words font-semibold">{name}</p>
          <p className="mt-1 text-sm text-slate-600">{detail}</p>
        </div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
          />
          <div
            ref={drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            className="relative flex h-full w-[min(90%,320px)] flex-col bg-white"
          >
            <div className="flex items-center justify-between p-5">
              <Logo compact />
              <button
                className="accessibility-control"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3">{links()}</div>
          </div>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl lg:px-8">
          <button
            ref={trigger}
            className="accessibility-control lg:hidden"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Buka menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{current?.label || role}</p>
            <p className="truncate text-sm text-slate-600">{detail}</p>
          </div>
          <TextSizeControl />
          <Logout />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="app-main page-enter mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
        <nav
          aria-label="Navigasi pantas"
          className="app-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-xl lg:hidden"
        >
          <ul className="grid grid-cols-5">
            {mobile.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active(path, item) ? "page" : undefined}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-semibold ${active(path, item) ? "text-blue-800" : "text-slate-600"}`}
                  >
                    <Icon size={22} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {role !== "Portal keluarga" && (
              <li>
                <button
                  className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold text-slate-600"
                  onClick={() => setOpen(true)}
                  aria-expanded={open}
                >
                  <Menu size={22} />
                  Lagi
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
}
export function WakilShell({
  name,
  familyId,
  children,
}: {
  name: string;
  familyId: string;
  children: ReactNode;
}) {
  return (
    <Shell
      name={name}
      role="Portal keluarga"
      detail={familyId}
      items={wakilItems}
    >
      {children}
    </Shell>
  );
}
export function AdminShell({
  name,
  accessProfile = "owner",
  children,
}: {
  name: string;
  accessProfile?: string;
  children: ReactNode;
}) {
  return (
    <Shell
      name={name}
      role="Ruang AJK"
      detail={
        accessProfile === "owner"
          ? "Pentadbir utama"
          : accessProfile === "treasurer"
            ? "Bendahari"
            : accessProfile === "approver"
              ? "Pelulus"
              : "Auditor · lihat sahaja"
      }
      items={adminItems.filter(
        (i) => !i.permission || can(accessProfile, i.permission),
      )}
    >
      {children}
    </Shell>
  );
}
