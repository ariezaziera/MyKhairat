import { z } from "zod";
export const importFamilySchema = z.object({
  wakilName: z.string().trim().min(2).max(120), phone: z.string().trim().max(30),
  members: z.array(z.object({ name: z.string().trim().min(2).max(120), relationship: z.string().trim().max(40), ic: z.string().trim().max(30) })).max(100),
});
export const importPayloadSchema = z.object({ joinedMonth: z.string().regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/), families: z.array(importFamilySchema).min(1).max(500) });
export type ImportFamily = z.infer<typeof importFamilySchema>;
export type ImportMapping = { wakil: number; phone: number; member: number; relationship: number; ic: number; extraMembers: number[] };
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
export function detectMapping(headers: string[]): ImportMapping {
  const find = (names: string[]) => headers.findIndex((header) => names.includes(normalize(header)));
  return {
    wakil: find(["wakil", "namawakil", "wakilname", "ketuakeluarga", "namaketuakeluarga", "representative", "familyhead", "namawakilkeluarga"]),
    phone: find(["phone", "telefon", "notel", "notelefon", "wakilphone", "nombortelefon", "nohp"]),
    member: find(["ahli", "namaahli", "member", "membername", "namaahlikeluarga", "namatanggungan", "name", "nama"]),
    relationship: find(["relationship", "hubungan", "pertalian"]),
    ic: find(["ic", "icnumber", "noic", "nokp", "kadpengenalan"]),
    extraMembers: headers.map((h, i) => /^(ahli|namaahli|member|tanggungan)\d+$/.test(normalize(h)) ? i : -1).filter((i) => i >= 0),
  };
}
export function groupImportRows(rows: string[][], mapping: ImportMapping) {
  const families = new Map<string, ImportFamily>(); const errors: string[] = [];
  let current = "";
  rows.forEach((row, index) => {
    if (!row.some((cell) => cell.trim())) return;
    const get = (col: number) => col >= 0 ? String(row[col] ?? "").trim() : "";
    const head = get(mapping.wakil); if (head) current = head;
    if (!current) { errors.push(`Baris ${index + 2}: nama wakil tiada.`); return; }
    const key = current.toLowerCase().replace(/\s+/g, " ");
    let family = families.get(key);
    if (!family) { family = { wakilName: current, phone: get(mapping.phone), members: [] }; families.set(key, family); }
    const phone = get(mapping.phone);
    if (phone && family.phone && phone !== family.phone) { errors.push(`Baris ${index + 2}: wakil ${current} mempunyai dua nombor telefon. Semak keluarga dengan nama sama.`); }
    if (!family.phone) family.phone = phone;
    for (const col of [mapping.member, ...mapping.extraMembers]) {
      const name = get(col); if (!name) continue;
      if (!family.members.some((member) => member.name.toLowerCase() === name.toLowerCase())) family.members.push({ name, relationship: col === mapping.member ? get(mapping.relationship) || "Ahli" : "Ahli", ic: col === mapping.member ? get(mapping.ic) : "" });
    }
  });
  for (const family of families.values()) {
    if (!family.members.some((member) => normalize(member.name) === normalize(family.wakilName))) family.members.unshift({ name: family.wakilName, relationship: "Wakil", ic: "" });
  }
  return { families: [...families.values()], errors };
}
