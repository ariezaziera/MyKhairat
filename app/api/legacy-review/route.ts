import { z } from "zod";
import { requireAdmin, json, errorResponse, AppError } from "@/lib/guard";
import { getClient } from "@/lib/db";
import { write, auditWrite } from "@/lib/write";
import { decryptBackup } from "@/lib/backup";

export async function GET(request: Request) {
  try {
    await requireAdmin("settings");
    const id=new URL(request.url).searchParams.get("id") || "";
    const row=(await getClient().execute({sql:"SELECT source_archive FROM legacy_imports WHERE id=?",args:[id]})).rows[0];
    if(!row) throw new AppError("Import tidak ditemui.",404);
    if(!process.env.BACKUP_PASSPHRASE) throw new AppError("Kunci arkib belum dikonfigurasi.",503);
    const source=decryptBackup(JSON.parse(String(row.source_archive)),process.env.BACKUP_PASSPHRASE);
    return new Response(Buffer.from(source.xlsx,"base64"),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":"attachment; filename=khairat-sumber-asal.xlsx","Cache-Control":"private, no-store"}});
  } catch(e) {return errorResponse(e);}
}
export async function POST(request: Request) {
  try {
    const actor=await requireAdmin("settings");
    const p=z.object({id:z.string().max(100),action:z.enum(["confirm-opening","approve-duplicate","reject-duplicate","resolve"]),note:z.string().trim().min(10).max(1000)}).parse(await request.json());
    await write(async tx=>{
      const issue=(await tx.execute({sql:"SELECT * FROM legacy_issues WHERE id=? AND status='Open'",args:[p.id]})).rows[0];
      if(!issue) throw new AppError("Isu telah disemak. Muat semula.",409);
      const batch=String(issue.batch_id), now=new Date().toISOString();
      if(issue.kind==="opening2025") {
        if(p.action!=="confirm-opening") throw new AppError("Pengesahan baki asal diperlukan.");
        const allocations=(await tx.execute({sql:"SELECT COUNT(*) n,SUM(amount_paid) total FROM payments WHERE source_batch_id=? AND is_opening_allocation=1 AND approval_status='Pending'",args:[batch]})).rows[0];
        if(Number(allocations.n)!==100 || Number(allocations.total)!==2000) throw new AppError("Agihan berubah; semak sebelum mengesahkan.",409);
        const opening=await tx.execute({sql:"UPDATE fund_entries SET confirmed=1,note=? WHERE id=? AND confirmed=0",args:[p.note,`${batch}-opening`]});
        if(opening.rowsAffected!==1) throw new AppError("Baki asal telah berubah.",409);
        await tx.execute({sql:"UPDATE payments SET approval_status='Approved',reviewed_by=?,reviewed_at=? WHERE source_batch_id=? AND is_opening_allocation=1 AND approval_status='Pending'",args:[actor.name,now,batch]});
        await tx.execute({sql:"UPDATE monthly_assessments SET confirmed=1,source=?,updated_at=? WHERE month BETWEEN '2025-08' AND '2025-12' AND family_id IN (SELECT family_id FROM payments WHERE source_batch_id=? AND is_opening_allocation=1)",args:[p.note,now,batch]});
      } else if(issue.kind==="duplicate") {
        if(!["approve-duplicate","reject-duplicate"].includes(p.action)) throw new AppError("Pilih keputusan pendua.");
        const decision=p.action==="approve-duplicate"?"Approved":"Rejected";
        const result=await tx.execute({sql:"UPDATE payments SET approval_status=?,rejection_reason=?,reviewed_by=?,reviewed_at=? WHERE source_batch_id=? AND source_row=9 AND is_opening_allocation=0 AND approval_status='Pending'",args:[decision,p.note,actor.name,now,batch]});
        if(result.rowsAffected!==2) throw new AppError("Agihan gabungan telah berubah.",409);
      } else if(p.action!=="resolve") throw new AppError("Tindakan tidak sesuai untuk isu ini.");
      await tx.execute({sql:"UPDATE legacy_issues SET status='Resolved',resolution=?,resolved_at=? WHERE id=?",args:[`${p.action}: ${p.note}`,now,p.id]});
      await auditWrite(tx,actor,"Semakan import workbook",p);
    });
    return json({ok:true});
  } catch(e) {return errorResponse(e);}
}
