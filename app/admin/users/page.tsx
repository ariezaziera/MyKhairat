import { requireAdminPage } from "@/lib/page-auth";
import { listAccounts } from "@/lib/queries";
import { AccountsBoard } from "./accounts-board";

export default async function AccountsPage() {
  const session = await requireAdminPage("accounts");
  const accounts = await listAccounts();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Akaun & kuasa</h1>
        <p className="text-sm text-slate-500">
          Urus kuasa AJK, akses wakil ganti, kod pengaktifan dan reset password.
        </p>
      </div>
      <AccountsBoard accounts={accounts} currentUserId={session.sub} />
    </div>
  );
}
