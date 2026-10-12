import { revealIC } from "./private-data";
import type { Transaction } from "@libsql/client";
import { getClient } from "./db";
import { malaysiaMonth, shiftMonth } from "./dates";
import { listMonths, type PaymentLite } from "./business";
import { write, auditWrite } from "./write";
import type { Session } from "./auth-token";
import { AppError } from "./guard";
export type BillingSnapshot = {
  month: string;
  expected: number;
  activeCount: number;
  rate: number;
  dueDay: number;
  confirmed: boolean;
  source: string;
};
export async function ensureAssessments(familyId: string) {
  const cached = await getClient().execute({
    sql: "SELECT * FROM monthly_assessments WHERE family_id=? ORDER BY month",
    args: [familyId],
  });
  if (cached.rows.some((r) => r.month === malaysiaMonth()))
    return cached.rows.map((r) => ({
      month: String(r.month),
      expected: Number(r.expected),
      activeCount: Number(r.active_count),
      rate: Number(r.rate),
      dueDay: Number(r.due_day),
      confirmed: Boolean(r.confirmed),
      source: String(r.source),
    }));
  return write(async (tx) => {
    const f = (
      await tx.execute({
        sql: "SELECT * FROM families WHERE family_id=?",
        args: [familyId],
      })
    ).rows[0];
    if (!f) throw new AppError("Keluarga tidak ditemui.", 404);
    const setting = (await tx.execute("SELECT * FROM settings WHERE id=1"))
      .rows[0];
    const people = (
      await tx.execute({
        sql: "SELECT * FROM members WHERE family_id=?",
        args: [familyId],
      })
    ).rows;
    const policies = (
      await tx.execute(
        "SELECT * FROM contribution_policies ORDER BY effective_month",
      )
    ).rows;
    const payments = (
      await tx.execute({
        sql: "SELECT payment_month_year,expected_amount FROM payments WHERE family_id=? AND approval_status='Approved'",
        args: [familyId],
      })
    ).rows;
    const now = malaysiaMonth();
    const baseline = String(setting.agreement_month ?? now);
    for (const month of listMonths(
      String(f.billing_start_month || f.joined_month),
      now,
    )) {
      const policy = [...policies]
        .reverse()
        .find((p) => String(p.effective_month) <= month);
      const count = people.filter((p) =>
        p.billing_start_month
          ? String(p.billing_start_month) <= month &&
            (!p.billing_end_month || String(p.billing_end_month) > month)
          : p.member_status === "Aktif",
      ).length;
      const rate = Number(policy?.rate ?? setting.base_rate_per_member);
      const approved = payments.filter((p) => p.payment_month_year === month);
      const historical = month < baseline;
      const expected = approved.length
        ? Math.max(...approved.map((p) => Number(p.expected_amount)))
        : count * rate;
      await tx.execute({
        sql: "INSERT OR IGNORE INTO monthly_assessments(family_id,month,active_count,rate,due_day,expected,confirmed,source,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
        args: [
          familyId,
          month,
          count,
          rate,
          Number(policy?.due_day ?? setting.payment_due_day),
          expected,
          historical || !f.registration_complete ? 0 : 1,
          historical
            ? "Semak sejarah 2025 / rekod asal"
            : !f.registration_complete
              ? "Sahkan bilangan ahli awal keluarga"
              : "Snapshot bulanan",
          new Date().toISOString(),
        ],
      });
    }
    return readSnapshots(tx, familyId);
  });
}
async function readSnapshots(
  tx: Transaction,
  familyId: string,
): Promise<BillingSnapshot[]> {
  const rows = (
    await tx.execute({
      sql: "SELECT * FROM monthly_assessments WHERE family_id=? ORDER BY month",
      args: [familyId],
    })
  ).rows;
  return rows.map((r) => ({
    month: String(r.month),
    expected: Number(r.expected),
    activeCount: Number(r.active_count),
    rate: Number(r.rate),
    dueDay: Number(r.due_day),
    confirmed: Boolean(r.confirmed),
    source: String(r.source),
  }));
}
export async function confirmAssessment(
  familyId: string,
  month: string,
  expected: number,
  count: number,
  reason: string,
  actor: Session,
) {
  await ensureAssessments(familyId);
  return write(async (tx) => {
    const before = (
      await tx.execute({
        sql: "SELECT * FROM monthly_assessments WHERE family_id=? AND month=?",
        args: [familyId, month],
      })
    ).rows[0];
    if (!before) throw new AppError("Bulan tidak ditemui.", 404);
    await tx.execute({
      sql: "UPDATE monthly_assessments SET expected=?,active_count=?,rate=?,confirmed=1,source=?,updated_at=? WHERE family_id=? AND month=?",
      args: [
        expected,
        count,
        count ? expected / count : 0,
        reason,
        new Date().toISOString(),
        familyId,
        month,
      ],
    });
    if (month === malaysiaMonth())
      await tx.execute({
        sql: "UPDATE families SET registration_complete=1 WHERE family_id=?",
        args: [familyId],
      });
    await auditWrite(tx, actor, "Sahkan caruman sejarah", {
      familyId,
      month,
      before: { expected: before.expected, confirmed: before.confirmed },
      after: { expected, count },
      reason,
    });
    return { ok: true };
  });
}
export async function policyFor(month: string) {
  return (
    await getClient().execute({
      sql: "SELECT * FROM contribution_policies WHERE effective_month<=? ORDER BY effective_month DESC LIMIT 1",
      args: [month],
    })
  ).rows[0];
}
export const memberEffectiveMonth = () => shiftMonth(malaysiaMonth(), 1);
export function maskIC(encrypted: string | null) {
  const value = revealIC(encrypted);
  return value
    ? `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`
    : null;
}
export async function fundSummary(asOf?: string) {
  const client = getClient();
  const where = asOf ? " AND payment_date<=?" : "";
  const [payments, claims, entries, reconciliation] = await Promise.all([
    client.execute({
      sql: `SELECT COALESCE(SUM(amount_paid),0) AS total FROM payments WHERE approval_status='Approved' AND is_opening_allocation=0${where}`,
      args: asOf ? [asOf] : [],
    }),
    client.execute({
      sql: `SELECT COALESCE(SUM(amount),0) AS total FROM claims WHERE status='Paid'${asOf ? " AND COALESCE(paid_date,claim_date)<=?" : ""}`,
      args: asOf ? [asOf] : [],
    }),
    client.execute({
      sql: `SELECT COALESCE(SUM(amount),0) AS total, COUNT(CASE WHEN kind='Opening' THEN 1 END) AS openings FROM fund_entries WHERE confirmed=1${asOf ? " AND date<=?" : ""}`,
      args: asOf ? [asOf] : [],
    }),
    client.execute(
      "SELECT * FROM bank_reconciliations ORDER BY date DESC,created_at DESC LIMIT 1",
    ),
  ]);
  const collected = Number(payments.rows[0].total),
    paid = Number(claims.rows[0].total),
    other = Number(entries.rows[0].total);
  return {
    balance: Math.round((collected - paid + other) * 100) / 100,
    collected,
    paid,
    other,
    hasOpening: Number(entries.rows[0].openings) > 0,
    reconciliation: reconciliation.rows[0] ?? null,
  };
}
export type { PaymentLite };
