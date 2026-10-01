import { requireAdminPage } from "@/lib/page-auth";
import { listAccounts } from "@/lib/queries";
import { AccountsBoard } from "./accounts-board";

export default async function AccountsPage() {
  const session = await requireAdminPage();
  const accounts = await listAccounts();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Accounts</h1>
        <p className="text-sm text-slate-500">Create extra AJK admins, reset passwords, and turn logins on or off. Disabled accounts cannot sign in.</p>
      </div>
      <AccountsBoard accounts={accounts} currentUserId={session.sub} />
    </div>
  );
}
