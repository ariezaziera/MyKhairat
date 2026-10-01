import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

const googleErrors: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured yet. Use email and password.",
  google_no_account: "That Google account is not registered. Ask the AJK to add your family email first.",
  google_state: "Google sign-in expired. Try again.",
  google_token: "Google could not complete sign-in.",
  google_profile: "Google did not return an email address.",
  disabled: "This login has been disabled. Ask an AJK admin to turn it back on.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params.error ? googleErrors[params.error] ?? "Sign-in failed." : undefined;
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <section className="relative hidden flex-col justify-between bg-brand-blue px-10 py-12 text-white lg:flex xl:px-16">
        <Logo inverse />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Sistem Dana Kita</p>
          <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight xl:text-5xl">The community fund, in one place.</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-white/85">
            Families submit payments. The committee verifies receipts, tracks arrears, and keeps Khairat Kematian eligibility clear.
          </p>
        </div>
        <p className="text-sm text-white/70">MyKhairat</p>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage your family khairat or review the fund.</p>
          <a
            href="/api/auth/google"
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <GoogleMark />
            Sign in with Google
          </a>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <LoginForm error={error} />
          <div className="mt-6 rounded-2xl bg-white p-4 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-800">Demo accounts</p>
            <p>Admin: admin@mykhairat.my / Admin@12345</p>
            <p>Wakil: siti@mykhairat.my / Wakil@12345</p>
            <p>Suspended family: hafizah@mykhairat.my / Wakil@12345</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.2 2.8-2.5 3.6v3h4c2.4-2.2 3.5-5.4 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-4-3c-1.1.7-2.5 1.2-3.9 1.2-3 0-5.6-2-6.5-4.8H1.4v3.1C3.4 21.3 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.5 14.5c-.2-.7-.4-1.4-.4-2.1s.1-1.5.4-2.1V7.2H1.4C.5 8.9 0 10.4 0 12.4s.5 3.5 1.4 5.2l4.1-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.7 1.4 7.2l4.1 3.1C6.4 6.8 9 4.8 12 4.8z" />
    </svg>
  );
}
