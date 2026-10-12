import { protectIC } from "@/lib/private-data";
import { randomUUID } from "crypto";
import { getClient } from "@/lib/db";
import { requireAdmin, json, errorResponse, AppError } from "@/lib/guard";
import { importPayloadSchema } from "@/lib/family-import";
import { uniqueUsername, DEFAULT_WAKIL_PASSWORD } from "@/lib/usernames";
import { hashPassword } from "@/lib/passwords";
import { issueActivation } from "@/lib/activation";
import { auditWrite } from "@/lib/write";
export async function POST(request: Request) {
  try {
    const session = await requireAdmin("families");
    const parsed = importPayloadSchema.safeParse(await request.json());
    if (!parsed.success)
      return json(
        {
          error:
            "Semak nama wakil, ahli dan bulan mula. Maksimum 500 keluarga setiap import.",
        },
        400,
      );
    const tx = await getClient().transaction("write");
    const accounts: {
      familyId: string;
      name: string;
      username: string;
      activationCode: string;
    }[] = [];
    try {
      const existing = await tx.execute("SELECT wakil_name FROM families");
      const existingNames = new Set(
        existing.rows.map((row) =>
          String(row.wakil_name).trim().toLowerCase().replace(/\s+/g, " "),
        ),
      );
      const users = await tx.execute("SELECT username FROM users");
      const occupied = new Set(
        users.rows.map((row) => String(row.username ?? "").toLowerCase()),
      );
      const timestamp = new Date().toISOString();
      for (const family of parsed.data.families) {
        const nameKey = family.wakilName.toLowerCase().replace(/\s+/g, " ");
        if (!family.externalId && existingNames.has(nameKey))
          throw new AppError(
            `Wakil ${family.wakilName} sudah wujud. Tiada data diimport; semak senarai untuk elak pendua.`,
            409,
          );
        if (!family.externalId) existingNames.add(nameKey);
        const activation = issueActivation();
        const username = uniqueUsername(family.wakilName, occupied);
        const familyId = `KI${randomUUID().slice(0, 8).toUpperCase()}`;
        await tx.execute({
          sql: "INSERT INTO families(family_id,wakil_name,wakil_phone,family_status,joined_month,opening_balance,notes,created_at,updated_at) VALUES (?,?,?,'Active',?,0,?,?,?)",
          args: [
            familyId,
            family.wakilName,
            family.phone,
            family.joinedMonth || parsed.data.joinedMonth,
            "Import Excel",
            timestamp,
            timestamp,
          ],
        });
        if (family.externalId)
          await tx.execute({
            sql: "UPDATE families SET external_id=? WHERE family_id=?",
            args: [family.externalId, familyId],
          });
        await tx.execute({
          sql: "INSERT INTO users(id,email,password_hash,name,role,family_id,phone,active,username,must_change_password,session_version,created_at) VALUES (?,?,?,?,'wakil',?,?,1,?,1,0,?)",
          args: [
            randomUUID(),
            `${username}@wakil.invalid`,
            hashPassword(DEFAULT_WAKIL_PASSWORD),
            family.wakilName,
            familyId,
            family.phone,
            username,
            timestamp,
          ],
        });
        await tx.execute({
          sql: "UPDATE users SET activation_required=1,activation_hash=?,activation_expires=? WHERE family_id=?",
          args: [activation.hash, activation.expires, familyId],
        });
        const people = [...family.members];
        if (
          !people.some(
            (m) => m.name.toLowerCase() === family.wakilName.toLowerCase(),
          )
        )
          people.unshift({
            name: family.wakilName,
            relationship: "Wakil",
            ic: "",
            status: "Aktif",
          });
        const names = new Set<string>();
        for (const person of people) {
          const key =
            person.externalId ||
            person.ic ||
            person.name.toLowerCase().replace(/\s+/g, " ");
          if (names.has(key)) continue;
          names.add(key);
          const memberId = randomUUID();
          await tx.execute({
            sql: "INSERT INTO members(member_id,family_id,member_name,member_status,relationship,ic_number,created_at) VALUES (?,?,?,'Aktif',?,?,?)",
            args: [
              memberId,
              familyId,
              person.name,
              key === nameKey ? "Wakil" : person.relationship || "Ahli",
              protectIC(person.ic),
              timestamp,
            ],
          });
          await tx.execute({
            sql: "UPDATE members SET external_id=?,member_status=?,billing_start_month=?,billing_end_month=? WHERE member_id=?",
            args: [
              person.externalId || null,
              person.status,
              family.joinedMonth || parsed.data.joinedMonth,
              person.status === "Tidak Aktif"
                ? family.joinedMonth || parsed.data.joinedMonth
                : null,
              memberId,
            ],
          });
        }
        accounts.push({
          familyId,
          name: family.wakilName,
          username,
          activationCode: activation.code,
        });
      }
      await tx.execute({
        sql: "INSERT INTO import_batches VALUES(?,?,?,?,?)",
        args: [
          randomUUID(),
          session.sub,
          accounts.length,
          JSON.stringify(
            accounts.map((a) => ({ familyId: a.familyId, name: a.name })),
          ),
          new Date().toISOString(),
        ],
      });
      await auditWrite(tx, session, "Import keluarga", {
        count: accounts.length,
      });
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
    return json({ accounts }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
