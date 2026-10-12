import ExcelJS from "exceljs";
import { createHash } from "crypto";

export type LegacyIssue = { kind: string; title: string; detail: string; status: "Open" | "Resolved"; resolution?: string };
export async function readLegacyWorkbook(buffer: Buffer) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = (name: string) => {
    const s = book.getWorksheet(name);
    if (!s) throw new Error(`Missing sheet: ${name}`);
    return s;
  };
  const val = (s: ExcelJS.Worksheet, r: number, c: number): string | number | Date => {
    const v = s.getRow(r).getCell(c).value;
    if (v instanceof Date) return v;
    if (v && typeof v === "object" && "result" in v) return (v.result ?? "") as string | number;
    return (v ?? "") as string | number;
  };
  const str = (s: ExcelJS.Worksheet, r: number, c: number) => String(val(s,r,c)).trim();
  const issues: LegacyIssue[] = [];
  const resolved = (kind: string, title: string, detail: string, resolution: string) => issues.push({kind,title,detail,status:"Resolved",resolution});
  const fs = sheet("Families");
  const families = [] as { id: string; name: string; wakil: string; row: number; count: number }[];
  for (let r=3; r<=fs.rowCount; r++) {
    if (!str(fs,r,2)) continue;
    const id = r===18 ? "K016" : str(fs,r,1).toUpperCase();
    if (!/^K\d{3}$/.test(id) || str(fs,r,5)!=="Active") throw new Error(`Unexpected family row ${r}`);
    families.push({id,name:str(fs,r,2),wakil:str(fs,r,3),row:r,count:0});
  }
  if (families.length!==20 || new Set(families.map(f=>f.id)).size!==20) throw new Error("Unexpected family count");
  const ms = sheet("Family_Members");
  const members = [] as { id: string; family: string; name: string; row: number }[];
  for (let r=3; r<=ms.rowCount; r++) {
    if (!str(ms,r,2)) continue;
    const family = [66,67].includes(r) ? "K016" : str(ms,r,1).toUpperCase();
    const f = families.find(f=>f.id===family);
    if (!f || str(ms,r,3)!=="Aktif") throw new Error(`Unexpected member row ${r}`);
    f.count++;
    members.push({id:`LM${r}`,family,name:str(ms,r,2),row:r});
  }
  if (members.length!==80 || families.find(f=>f.id==="K004")?.count!==5 || families.find(f=>f.id==="K016")?.count!==2 || members.find(m=>m.row===66)?.name!==families.find(f=>f.id==="K016")?.name) throw new Error("Member mapping changed; review source before import");
  resolved("family-split","K004 / K016 diasingkan", "Families!A18 dan Family_Members!A66:A67 menggunakan K004. Printed Summary memisahkan K016.","Pengesahan pemilik: RM35 ialah bayaran gabungan. K004 5 ahli / RM25, K016 2 ahli / RM10.");
  resolved("representative","Wakil K003", "Nama wakil berbeza antara Families dan Printed Family Summary.","Pengesahan pemilik: gunakan Haiqal daripada Families.");
  const date = (v: string | number | Date) => {
    if (v instanceof Date) return v.toISOString().slice(0,10);
    const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m || Number(m[2])<=12) throw new Error("Unknown or ambiguous source date");
    const d = `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
    if (new Date(d).toISOString().slice(0,10)!==d) throw new Error("Invalid source date");
    return d;
  };
  const months = ["jan","feb","mac","apr","mei","jun","jul","ogos","sep","okt","nov","dis"];
  const ps = sheet("Family_Payments_Log");
  const payments = [] as { family: string; date: string; month: string; amount: number; reference: string; row: number; pending: boolean; note: string }[];
  const seen = new Map<string,number>();
  let sourceTotal=0, sourceRows=0, textDateAmount=0;
  for (let r=3;r<=ps.rowCount;r++) {
    if (!str(ps,r,2)) continue;
    const family=str(ps,r,2).toUpperCase(), d=date(val(ps,r,1)), monthIndex=months.indexOf(str(ps,r,3).toLowerCase());
    const amount=Number(val(ps,r,4)), reference=str(ps,r,6);
    if (monthIndex<0 || !families.some(f=>f.id===family) || d.slice(0,4)!=="2026" || !Number.isFinite(amount) || amount<=0) throw new Error(`Invalid payment row ${r}`);
    const month=`2026-${String(monthIndex+1).padStart(2,"0")}`;
    const fingerprint=JSON.stringify([family,d,month,amount,str(ps,r,5),reference]);
    const duplicate=seen.get(fingerprint);
    seen.set(fingerprint,r);
    if (duplicate) issues.push({kind:"duplicate",title:`Kemungkinan pendua RM${amount}`,detail:`Family_Payments_Log!${r} sama dengan baris ${duplicate}: ${family}, ${d}, ${month}. Dua agihan K004/K016 ditahan bersama.`,status:"Open"});
    if (!(val(ps,r,1) instanceof Date)) textDateAmount+=amount;
    sourceRows++; sourceTotal+=amount;
    const allocations=family==="K004" ? [{family:"K004",amount:25},{family:"K016",amount:10}] : [{family,amount}];
    if (allocations.reduce((s,a)=>s+a.amount,0)!==amount) throw new Error("Unexpected combined amount");
    for (const a of allocations) payments.push({...a,date:d,month,reference,row:r,pending:Boolean(duplicate),note:`Import Family_Payments_Log baris ${r}. Cara: ${str(ps,r,5)}. Amaun daripada nilai formula tersimpan; bukan bukti bank.${family==="K004" ? " Bayaran gabungan RM35: K004 RM25 + K016 RM10 (disahkan pemilik)." : ""}${duplicate ? " Kemungkinan pendua; menunggu semakan." : ""}`});
  }
  if(sourceRows!==112 || sourceTotal!==2395 || payments.length!==121 || payments.filter(p=>p.pending).some(p=>p.row!==9) || payments.filter(p=>p.pending).reduce((s,p)=>s+p.amount,0)!==35) throw new Error("Source totals changed; manual review required");
  resolved("text-dates","Tarikh teks menyebabkan dashboard kurang kira",`Tarikh teks bernilai RM${textDateAmount} tidak dikira oleh SUMIFS tarikh. Dashboard asal menunjukkan RM1,300 berbanding log RM2,395.`,"Tarikh dinormalkan tanpa mengubah tarikh wang diterima. RM35 kemungkinan pendua ditahan; kutipan diterima daripada log RM2,360.");
  issues.push({kind:"references",title:"Rujukan dan bukti transaksi belum disahkan",detail:"Semua amaun log ialah formula mengikut bilangan ahli semasa. Rujukan mengandungi salah salin, KO11, MQC, 20256 dan rujukan sama untuk keluarga/bulan berlainan. Rujukan asal disimpan; ID import bukan nombor transaksi bank. Semak dengan penyata / resit asal.",status:"Open"});
  const ds=sheet("Disbursements");
  const claims=[] as { row:number; member:string; family:string; date:string; amount:number; recipient:string; note:string }[];
  for(let r=3;r<=ds.rowCount;r++) {
    if(!str(ds,r,2)) continue;
    const member=members.find(m=>m.name.toLowerCase()===str(ds,r,2).toLowerCase());
    if(!member) throw new Error(`Unmatched claim row ${r}`);
    claims.push({row:r,member:member.id,family:member.family,date:date(val(ds,r,1)),amount:Number(val(ds,r,4)),recipient:str(ds,r,3),note:str(ds,r,6)});
  }
  if(claims.length!==2 || claims.reduce((s,c)=>s+c.amount,0)!==400) throw new Error("Unexpected claims");
  issues.push({kind:"claim-evidence",title:"Dua bantuan wad tanpa bukti bank",detail:"Disbursements!3:4: RM200 setiap kes. Diimport sebagai bayaran lama menurut fail, bukan kelulusan tuntutan baharu. Tarikh kemasukan sebenar, resit, nombor akaun dan rujukan bank tidak tersedia. Ejaan penerima K011 berbeza daripada daftar ahli; dikekalkan seperti sumber.",status:"Open"});
  const annual=sheet("2025_Family_Payments");
  if(Number(val(annual,3,18))!==2000 || Number(val(sheet("Settings"),3,2))!==5 || Number(val(sheet("Settings"),5,2))!==10) throw new Error("Source policy changed");
  for(let r=5;r<=24;r++) for(let c=11;c<=15;c++) if(str(annual,r,c)!=="/") throw new Error("2025 marks changed");
  issues.push({kind:"opening2025",title:"Caruman 2025 dan baki RM2,000 belum disahkan",detail:"Pemilik belum pasti maksud tanda / bagi Ogos–Disember 2025. 100 agihan bulanan disimpan Pending; tarikh 31 Disember ialah tarikh cutover, bukan tarikh transaksi bank. Baki asal RM2,000 juga belum disahkan dan tidak menambah dana.",status:"Open"});
  resolved("year-formula","Status PAID 2025 mengambil log 2026", "Formula Jan–Jul 2025 tidak menapis tahun transaksi.","Status terbitan ini tidak dijadikan bayaran 2025. Hanya tanda / Ogos–Disember direkod untuk semakan.");
  issues.push({kind:"source-details",title:"Butiran keluarga yang perlu dilengkapkan",detail:"Telefon wakil, IC, hubungan ahli dan tarikh menyertai individu tiada dalam sumber. Ogos 2025 digunakan sebagai permulaan program, bukan tarikh daftar yang telah dibuktikan. K020: kiraan 2025 menyebut 2 tetapi daftar mengandungi 4; Printed Summary tidak menyenaraikan K020. Variasi ejaan K010/K015 dikekalkan dalam arkib; daftar Families digunakan.",status:"Open"});
  return {sha:createHash("sha256").update(buffer).digest("hex"),families,members,payments,claims,issues,summary:{families:20,members:80,monthlyDues:400,sourcePayments:sourceRows,sourceTotal,approvedAllocations:119,approvedCollections:2360,pendingDuplicate:35,pendingOpening:2000,claims:2,disbursed:400,confirmedBookBalance:1960,textDateAmount}};
}
