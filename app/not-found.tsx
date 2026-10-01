import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold text-brand-blue">MyKhairat</p>
      <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
      <Link href="/" className="mt-6 rounded-2xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white">
        Back to MyKhairat
      </Link>
    </main>
  );
}
