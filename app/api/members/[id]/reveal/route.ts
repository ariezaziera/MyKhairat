import { revealIC } from "@/lib/private-data";
import { requireAdmin, json, errorResponse } from "@/lib/guard";
import { write, auditWrite } from "@/lib/write";
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin("families"),
      { id } = await params;
    return json(
      await write(async (tx) => {
        const row = (
          await tx.execute({
            sql: "SELECT ic_number FROM members WHERE member_id=?",
            args: [id],
          })
        ).rows[0];
        await auditWrite(tx, actor, "Lihat IC", { memberId: id });
        return {
          icNumber: revealIC(row?.ic_number ? String(row.ic_number) : null),
        };
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
