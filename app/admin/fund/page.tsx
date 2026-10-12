import { requireAdminPage } from "@/lib/page-auth";
import { getClient } from "@/lib/db";
import { fundSummary } from "@/lib/finance";
import { PageHeading } from "@/components/page-heading";
import { FundBoard } from "./fund-board";
export default async function FundPage() {
  await requireAdminPage();
  const [summary, entries, reconciliations] = await Promise.all([
    fundSummary(),
    getClient().execute(
      "SELECT * FROM fund_entries ORDER BY date DESC,created_at DESC LIMIT 500",
    ),
    getClient().execute(
      "SELECT * FROM bank_reconciliations ORDER BY date DESC LIMIT 100",
    ),
  ]);
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Amanah dana"
        title="Ledger & semakan bank"
        description="Baki dana = kutipan disahkan + baki asal / derma / pelarasan − bantuan dibayar / perbelanjaan."
      />
      <FundBoard
        balance={summary.balance}
        hasOpening={summary.hasOpening}
        entries={
          entries.rows.map((r) => ({ ...r })) as unknown as Record<
            string,
            string | number
          >[]
        }
        reconciliations={
          reconciliations.rows.map((r) => ({ ...r })) as unknown as Record<
            string,
            string | number
          >[]
        }
      />
    </div>
  );
}
