import { loadEnvConfig } from "@next/env";
import { readFile, writeFile, mkdir } from "fs/promises";
import { createClient, type InStatement, type InValue } from "@libsql/client";
import { readLegacyWorkbook } from "../lib/legacy-workbook";
import { BACKUP_TABLES, encryptBackup, decryptBackup } from "../lib/backup";
import { hashPassword } from "../lib/passwords";
import { uniqueUsername, DEFAULT_WAKIL_PASSWORD } from "../lib/usernames";
import { issueActivation } from "../lib/activation";

async function main() {
  loadEnvConfig(process.cwd());
  const file=process.argv.find(a=>a.endsWith(".xlsx"));
  if(!file) throw new Error("Pass the audited source .xlsx path; default is preview only. --apply writes production; --local uses isolated SQLite.");
  const buffer=await readFile(file), data=await readLegacyWorkbook(buffer);
  console.log(JSON.stringify(data.summary,null,2));
  if(!process.argv.includes("--apply") && !process.argv.includes("--backup-only")) return;
  const local=process.argv.includes("--local");
  if(local) {process.env.TURSO_DATABASE_URL="file:backups/legacy-rehearsal.db";process.env.TURSO_AUTH_TOKEN="";}
  const url=process.env.TURSO_DATABASE_URL;
  const passphrase=process.env.BACKUP_PASSPHRASE;
  if(!url || !passphrase) throw new Error("Database and backup configuration required");
  const client=createClient({url,authToken:process.env.TURSO_AUTH_TOKEN || undefined});
  const existingTables=(await client.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r=>String(r.name));
  if(existingTables.includes("legacy_imports") && (await client.execute({sql:"SELECT id FROM legacy_imports WHERE source_sha256=?",args:[data.sha]})).rows.length) {console.log("Already imported: no changes.");client.close();return;}
  await mkdir("backups",{recursive:true});
  const tables: Record<string,unknown[]>= {};
  for(const table of BACKUP_TABLES) tables[table]=existingTables.includes(table) ? (await client.execute(`SELECT * FROM ${table}`)).rows : [];
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  const backup=encryptBackup({version:1,createdAt:new Date().toISOString(),tables},passphrase);
  const backupPath=`backups/pre-legacy-${local?"local":"production"}-${stamp}.json`;
  await writeFile(backupPath,JSON.stringify(backup));
  if(JSON.stringify(decryptBackup(JSON.parse(await readFile(backupPath,"utf8")),passphrase).tables)!==JSON.stringify(tables)) throw new Error("Backup roundtrip failed");
  console.log("Encrypted backup saved and verified.");
  client.close();
  if(process.argv.includes("--backup-only")) return;
  const {ensureSchema,getClient}=await import("../lib/db");
  await ensureSchema();
  const db=getClient();
  if(local && !(await db.execute("SELECT id FROM users WHERE role='admin'")).rows.length) await db.execute({sql:"INSERT INTO users(id,email,password_hash,name,role,created_at) VALUES('rehearsal-admin','rehearsal@invalid',?,'Rehearsal','admin',?)",args:[hashPassword("local-rehearsal-only"),new Date().toISOString()]});
  const accounts=(await db.execute("SELECT id,username,role,family_id FROM users")).rows;
  const actor=accounts.find(u=>u.role==="admin");
  if(!actor) throw new Error("Existing administrator required");
  const now=new Date().toISOString(), batch=`legacy-${data.sha.slice(0,16)}`;
  const occupied=new Set(accounts.filter(a=>a.family_id!=="K001").map(a=>String(a.username||"").toLowerCase()));
  const handover=[] as {family:string;username:string;activation:string;expires:string}[];
  const statements: InStatement[]=[];
  const insert=(table:string,row:Record<string,InValue>)=>statements.push({sql:`INSERT INTO ${table}(${Object.keys(row).join(",")}) VALUES(${Object.keys(row).map(()=>"?").join(",")})`,args:Object.values(row)});
  for(const f of data.families) {
    insert("families",{family_id:f.id,family_name:f.name,wakil_name:f.wakil,wakil_phone:"",family_status:"Active",joined_month:"2025-08",billing_start_month:"2025-08",opening_balance:0,registration_complete:1,external_id:f.id,notes:"Import Families. Tarikh mula berdasarkan permulaan program; butiran hubungan / telefon belum diberi.",created_at:now,updated_at:now});
    const username=uniqueUsername(f.wakil,occupied), activation=issueActivation();
    handover.push({family:f.id,username,activation:activation.code,expires:activation.expires});
    insert("users",{id:`LU${f.id}`,email:`${username}@wakil.invalid`,username,password_hash:hashPassword(DEFAULT_WAKIL_PASSWORD),name:f.wakil,role:"wakil",family_id:f.id,phone:"",active:1,must_change_password:1,activation_required:1,activation_hash:activation.hash,activation_expires:activation.expires,created_at:now});
    for(let y=2025;y<=2026;y++) for(let m=y===2025?8:1;m<=12;m++) {
      const month=`${y}-${String(m).padStart(2,"0")}`;
      insert("monthly_assessments",{family_id:f.id,month,active_count:f.count,rate:5,due_day:10,expected:f.count*5,confirmed:y===2025?0:1,source:y===2025?"Import: tanda / 2025 belum disahkan":"Daftar dan kadar workbook 2026; K004/K016 diasingkan",updated_at:now});
      if(y===2025) insert("payments",{payment_id:`LP25-${f.id}-${m}`,family_id:f.id,payment_date:"2025-12-31",payment_month_year:month,amount_paid:f.count*5,expected_amount:f.count*5,transaction_reference:`LEGACY2025-${f.id}-${m}`,approval_status:"Pending",submitted_by:actor.id,entry_note:"Tanda / pada jadual 2025; belum disahkan pemilik. Tarikh cutover sahaja, bukan tarikh wang diterima. Agihan baki asal; bukan kutipan tunai tambahan.",is_opening_allocation:1,source_reference:"/",source_batch_id:batch,source_row:f.row+2,created_at:now});
    }
  }
  for(const m of data.members) insert("members",{member_id:m.id,family_id:m.family,member_name:m.name,member_status:"Aktif",relationship:"Belum dinyatakan",billing_start_month:"2025-08",external_id:`row-${m.row}`,created_at:now});
  for(const p of data.payments) insert("payments",{payment_id:`LP26-${p.row}-${p.family}`,family_id:p.family,payment_date:p.date,payment_month_year:p.month,amount_paid:p.amount,expected_amount:data.families.find(f=>f.id===p.family)!.count*5,transaction_reference:`LEGACY2026-R${p.row}-${p.family}`,approval_status:p.pending?"Pending":"Approved",reviewed_by:p.pending?null:"Import rekod sedia ada",reviewed_at:p.pending?null:now,submitted_by:actor.id,entry_note:p.note,is_opening_allocation:0,source_reference:p.reference,source_batch_id:batch,source_row:p.row,created_at:now});
  for(const c of data.claims) insert("claims",{claim_id:`LC26-${c.row}`,family_id:c.family,member_id:c.member,claim_date:c.date,claim_type:"Warded",amount:c.amount,status:"Paid",recipient_name:c.recipient,paid_date:c.date,event_key:`${batch}-claim-${c.row}`,policy_amount:c.amount,exception_reason:"Migrasi bantuan lama menurut Disbursements; dokumen dan tarikh kemasukan sebenar belum tersedia.",notes:`${c.note}. Sumber Disbursements baris ${c.row}; bukti bank belum tersedia.`,created_by:actor.id,created_at:now});
  insert("fund_entries",{id:`${batch}-opening`,date:"2025-12-31",kind:"Opening",amount:2000,reference:`${batch}-2025`,note:"Baki sumber 2025 RM2,000 belum disahkan pemilik; dikecualikan daripada baki dana.",actor_id:actor.id,created_at:now,confirmed:0});
  insert("legacy_imports",{id:batch,source_sha256:data.sha,source_name:"Khairat 2025–2026.xlsx",source_archive:JSON.stringify(encryptBackup({xlsx:buffer.toString("base64")},passphrase)),summary:JSON.stringify(data.summary),created_at:now});
  data.issues.forEach((i,n)=>insert("legacy_issues",{id:`${batch}-${n}`,batch_id:batch,kind:i.kind,title:i.title,detail:i.detail,status:i.status,resolution:i.resolution||null,created_at:now,resolved_at:i.status==="Resolved"?now:null}));
  statements.push({sql:"UPDATE settings SET program_start_month='2025-08',base_rate_per_member=5,payment_due_day=10,agreement_month='2026-01',updated_at=? WHERE id=1",args:[now]});
  statements.push({sql:"DELETE FROM contribution_policies"});
  insert("contribution_policies",{effective_month:"2025-08",rate:5,due_day:10,death_amount:2000,warded_amount:200,note:"Kadar / hari akhir mengikut Settings workbook; amaun bantuan dikekalkan daripada sistem. Rekod 2025 belum disahkan.",created_at:now});
  insert("activity_log",{id:`${batch}-audit`,actor_id:actor.id,actor_name:"Pentadbir / import yang diarahkan pemilik",action:"Import workbook dan buang keluarga ujian",detail:JSON.stringify({batch,sourceSHA256:data.sha,summary:data.summary,decisions:["Habibah K001 / kredit RM250 ialah ujian; dibuang selepas backup","K003 gunakan wakil Families","K004/K016 bayaran gabungan","2025 belum disahkan"]}),created_at:now});
  // Keep activation codes encrypted on disk, never in logs or repository.
  await writeFile(`backups/legacy-accounts-${local?"local":"production"}-${stamp}.json`,JSON.stringify(encryptBackup({accounts:handover},passphrase)));
  const tx=await db.transaction("write");
  try {
    if((await tx.execute("SELECT id FROM legacy_imports")).rows.length) throw new Error("Another import exists; abort");
    for(const table of ["members","payments","claims","receipts","member_requests","fund_entries","bank_reconciliations","import_batches"]) if(Number((await tx.execute(`SELECT COUNT(*) n FROM ${table}`)).rows[0].n)!==0) throw new Error(`Unexpected existing ${table}; no data deleted`);
    const fs=(await tx.execute("SELECT * FROM families")).rows;
    if(fs.length && !(fs.length===1 && fs[0].family_id==="K001" && fs[0].wakil_name==="Habibah" && Number(fs[0].opening_balance)===250)) throw new Error("Existing families no longer match authorized test record");
    const wakils=(await tx.execute("SELECT id,username,family_id FROM users WHERE role='wakil'")).rows;
    if(wakils.some(u=>u.family_id!=="K001" || u.username!=="habibah")) throw new Error("Unexpected existing wakil account");
    await tx.execute("DELETE FROM monthly_assessments WHERE family_id='K001'");
    await tx.execute("DELETE FROM users WHERE role='wakil' AND family_id='K001' AND username='habibah'");
    await tx.execute("DELETE FROM families WHERE family_id='K001'");
    await tx.batch(statements);
    if((await tx.execute("PRAGMA foreign_key_check")).rows.length) throw new Error("Foreign key validation failed");
    const check=(await tx.execute("SELECT (SELECT COUNT(*) FROM families) families,(SELECT COUNT(*) FROM members) members,(SELECT SUM(amount_paid) FROM payments WHERE approval_status='Approved' AND is_opening_allocation=0) collections,(SELECT SUM(amount) FROM claims WHERE status='Paid') disbursed")).rows[0];
    if(Number(check.families)!==20 || Number(check.members)!==80 || Number(check.collections)!==2360 || Number(check.disbursed)!==400) throw new Error("Post-import totals failed");
    await tx.commit();console.log("Committed and verified: 20 families, 80 members, RM2360 collections, RM400 paid; RM2000 opening + RM35 duplicate pending.");
  } catch(e) {await tx.rollback();throw e;} finally {tx.close();db.close();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Import failed");process.exitCode=1;});
