import { z } from "zod";
export const importFamilySchema = z.object({
  externalId: z.string().trim().max(80).optional(),
  joinedMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  wakilName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30),
  members: z
    .array(
      z.object({
        externalId: z.string().trim().max(80).optional(),
        status: z.enum(["Aktif", "Tidak Aktif"]).default("Aktif"),
        name: z.string().trim().min(2).max(120),
        relationship: z.string().trim().max(40),
        ic: z.string().trim().max(30),
      }),
    )
    .max(100),
});
export const importPayloadSchema = z.object({
  joinedMonth: z.string().regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/),
  families: z.array(importFamilySchema).min(1).max(500),
});
export type ImportFamily = z.infer<typeof importFamilySchema>;
export type ImportMapping = {
  wakil: number;
  phone: number;
  member: number;
  relationship: number;
  ic: number;
  extraMembers: number[];
  familyKey?: number;
  memberKey?: number;
  joined?: number;
  status?: number;
};
const normalize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]/g, "");
export function detectMapping(headers: string[]): ImportMapping {
  const find = (names: string[]) =>
    headers.findIndex((header) => names.includes(normalize(header)));
  return {
    familyKey: find(["familyid", "idkeluarga", "kodkeluarga"]),
    memberKey: find(["memberid", "idahli"]),
    joined: find(["joinedmonth", "bulanmula", "bulansertai"]),
    status: find(["status", "statusahli", "memberstatus"]),
    wakil: find([
      "wakil",
      "namawakil",
      "wakilname",
      "ketuakeluarga",
      "namaketuakeluarga",
      "representative",
      "familyhead",
      "namawakilkeluarga",
    ]),
    phone: find([
      "phone",
      "telefon",
      "notel",
      "notelefon",
      "wakilphone",
      "nombortelefon",
      "nohp",
    ]),
    member: find([
      "ahli",
      "namaahli",
      "member",
      "membername",
      "namaahlikeluarga",
      "namatanggungan",
      "name",
      "nama",
    ]),
    relationship: find(["relationship", "hubungan", "pertalian"]),
    ic: find(["ic", "icnumber", "noic", "nokp", "kadpengenalan"]),
    extraMembers: headers
      .map((h, i) =>
        /^(ahli|namaahli|member|tanggungan)\d+$/.test(normalize(h)) ? i : -1,
      )
      .filter((i) => i >= 0),
  };
}
export function groupImportRows(rows: string[][], mapping: ImportMapping) {
  const families = new Map<string, ImportFamily>();
  const errors: string[] = [];
  let current = "",
    currentKey = "";
  rows.forEach((row, index) => {
    if (!row.some((cell) => cell.trim())) return;
    const get = (col: number) =>
      col >= 0 ? String(row[col] ?? "").trim() : "";
    const head = get(mapping.wakil);
    if (head) current = head;
    if (!current) {
      errors.push(`Baris ${index + 2}: nama wakil tiada.`);
      return;
    }
    const explicit = get(mapping.familyKey ?? -1);
    if (head)
      currentKey =
        explicit ||
        current.toLowerCase().replace(/\s+/g, " ") + "|" + get(mapping.phone);
    const key = explicit || currentKey;
    let family = families.get(key);
    if (!family) {
      family = {
        externalId: explicit || undefined,
        joinedMonth: get(mapping.joined ?? -1) || undefined,
        wakilName: current,
        phone: get(mapping.phone),
        members: [],
      };
      families.set(key, family);
    }
    const phone = get(mapping.phone);
    if (phone && family.phone && phone !== family.phone) {
      errors.push(
        `Baris ${index + 2}: wakil ${current} mempunyai dua nombor telefon. Semak keluarga dengan nama sama.`,
      );
    }
    if (!family.phone) family.phone = phone;
    for (const col of [mapping.member, ...mapping.extraMembers]) {
      const name = get(col);
      if (!name) continue;
      const memberKey = get(mapping.memberKey ?? -1),
        ic = col === mapping.member ? get(mapping.ic) : "";
      const same = family.members.find((m) =>
        memberKey
          ? m.externalId === memberKey
          : ic
            ? m.ic === ic
            : m.name.toLowerCase() === name.toLowerCase(),
      );
      if (
        same &&
        name.toLowerCase() !== current.toLowerCase() &&
        !memberKey &&
        !ic
      ) {
        errors.push(
          `Baris ${index + 2}: nama ahli ${name} berulang. Gunakan ID Ahli atau IC untuk membezakan orang.`,
        );
        continue;
      }
      if (!same)
        family.members.push({
          externalId: memberKey || undefined,
          status: /tidak|inactive/i.test(get(mapping.status ?? -1))
            ? "Tidak Aktif"
            : "Aktif",
          name,
          relationship:
            col === mapping.member
              ? get(mapping.relationship) || "Ahli"
              : "Ahli",
          ic: col === mapping.member ? get(mapping.ic) : "",
        });
    }
  });
  for (const family of families.values()) {
    if (
      !family.members.some(
        (member) => normalize(member.name) === normalize(family.wakilName),
      )
    )
      family.members.unshift({
        name: family.wakilName,
        relationship: "Wakil",
        ic: "",
        status: "Aktif",
      });
  }
  return { families: [...families.values()], errors };
}
