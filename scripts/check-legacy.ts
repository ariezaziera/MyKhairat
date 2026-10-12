import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";
import { readLegacyWorkbook } from "../lib/legacy-workbook";
import { buildMonthRows } from "../lib/business";
async function main() {
  const source=await readLegacyWorkbook(await readFile("backups/source-khairat-2026-10-12.xlsx"));
  assert.equal(source.families.length,20);assert.equal(source.members.length,80);
  assert.equal(source.payments.length,121);
  assert.equal(source.payments.filter(p=>p.pending).reduce((s,p)=>s+p.amount,0),35);
  assert.equal(source.payments.filter(p=>!p.pending).reduce((s,p)=>s+p.amount,0),2360);
  assert.equal(source.summary.textDateAmount,1095);
  assert.equal(source.payments.filter(p=>p.family==="K016").length,9);
  const db=createClient({url:"file:backups/legacy-rehearsal.db"});
  const scalar=async(sql:string)=>Number((await db.execute(sql)).rows[0].n);
  assert.equal(await scalar("SELECT COUNT(*) n FROM users WHERE role='wakil' AND must_change_password=1 AND activation_required=1"),20);
  assert.equal(await scalar("SELECT COUNT(*) n FROM monthly_assessments WHERE month<'2026-01' AND confirmed=0"),100);
  assert.equal(await scalar("SELECT SUM(amount_paid) n FROM payments WHERE is_opening_allocation=1 AND approval_status='Pending'"),2000);
  assert.equal(await scalar("SELECT COUNT(*) n FROM members WHERE family_id='K004'"),5);
  assert.equal(await scalar("SELECT COUNT(*) n FROM members WHERE family_id='K016'"),2);
  assert.equal((await db.execute("PRAGMA foreign_key_check")).rows.length,0);
  const balanceSQL="SELECT (SELECT COALESCE(SUM(amount_paid),0) FROM payments WHERE approval_status='Approved' AND is_opening_allocation=0)+(SELECT COALESCE(SUM(amount),0) FROM fund_entries WHERE confirmed=1)-(SELECT COALESCE(SUM(amount),0) FROM claims WHERE status='Paid') n";
  assert.equal(await scalar(balanceSQL),1960);
  const tx=await db.transaction("write");
  try {
    await tx.execute("UPDATE payments SET approval_status='Approved' WHERE is_opening_allocation=1");
    await tx.execute("UPDATE fund_entries SET confirmed=1 WHERE kind='Opening'");
    assert.equal(Number((await tx.execute(balanceSQL)).rows[0].n),3960,"Opening must be counted once, not twice");
  } finally {await tx.rollback();tx.close();db.close();}
  const future=buildMonthRows({joinedMonth:"2026-01",fromMonth:"2026-12",toMonth:"2026-12",activeCount:2,rate:5,dueDay:10,now:new Date("2026-10-13T00:00:00Z"),payments:[{paymentMonthYear:"2026-12",amountPaid:10,approvalStatus:"Approved"}]});
  assert.equal(future[0].state,"Paid");
  console.log("Legacy checks passed: source conservation, combined allocation, protected accounts, pending 2025, cash balance, no double count, advance payment, foreign keys.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
