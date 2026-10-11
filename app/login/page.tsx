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
          <div className="mt-6"><LoginForm error={error} /></div>
          <p className="mt-6 text-sm text-slate-500">Lupa password? Hubungi admin untuk reset akaun.</p>
        </div>
      </section>
    </main>
  );
}
