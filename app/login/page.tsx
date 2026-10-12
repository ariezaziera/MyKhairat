import { Logo } from "@/components/logo";
import { FamilyScene } from "@/components/family-scene";
import { MotionControls } from "@/components/motion-controls";
import { LoginForm } from "./login-form";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="login-art hidden flex-col justify-between p-10 lg:flex xl:p-16">
        <Logo />
        <div>
          <p className="eyebrow">Sistem Dana Kita</p>
          <h1 className="max-w-lg text-5xl leading-tight">
            Keluarga dijaga.
            <br />
            Amanah bersama.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">
            Satu tempat untuk AJK mengurus caruman, menyemak resit WhatsApp dan
            membantu keluarga ketika diperlukan.
          </p>
          <FamilyScene />
        </div>
        <p className="text-slate-600">
          Khairat kematian & bantuan wad kritikal
        </p>
      </section>
      <section className="flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="mb-8">
            <MotionControls />
          </div>
          <p className="eyebrow">MyKhairat</p>
          <h2 className="text-3xl font-semibold">Selamat datang</h2>
          <p className="mt-3 leading-7 text-slate-600">
            AJK mengurus dana. Wakil boleh menyemak rekod keluarga apabila
            diperlukan.
          </p>
          <div className="mt-7">
            <LoginForm
              error={
                params.error === "disabled"
                  ? "Akses dinyahaktifkan. Hubungi AJK untuk bantuan."
                  : undefined
              }
            />
          </div>
          <div className="mt-7 rounded-xl bg-slate-100 p-4 text-slate-600">
            <strong className="text-slate-800">
              Lupa password atau belum pernah login?
            </strong>
            <p className="mt-2">
              Hubungi AJK untuk reset atau kod pengaktifan. Resit masih boleh
              dihantar melalui WhatsApp seperti biasa.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
