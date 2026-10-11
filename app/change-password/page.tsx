import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { ChangePasswordForm } from "./form";
export default async function ChangePasswordPage() {
  let session;
  try { session = await requireSession(true); } catch { redirect("/login"); }
  return <main className="mx-auto flex min-h-screen max-w-lg items-center p-4"><ChangePasswordForm name={session.name} /></main>;
}
