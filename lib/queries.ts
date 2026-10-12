import { protectIC } from "./private-data";
import { randomBytes } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  assessFamily,
  buildMonthRows,
  memberEligibility,
  type Assessment,
} from "./business";
import { bootstrap } from "./bootstrap";
import { getDb, getClient } from "./db";
import { nowIso, todayDate } from "./format";
import { AppError } from "./guard";
import { hashPassword } from "./passwords";
import {
  activityLog,
  claims,
  families,
  memberRequests,
  members,
  payments,
  receipts,
  settings,
  users,
} from "./schema";
import type { Session } from "./auth-token";
import {
  ensureAssessments,
  fundSummary,
  policyFor,
  maskIC,
  memberEffectiveMonth,
} from "./finance";
import { write, auditWrite } from "./write";
import { malaysiaMonth } from "./dates";
import { can } from "./permissions";
import { issueActivation } from "./activation";
import { uniqueUsername, DEFAULT_WAKIL_PASSWORD } from "./usernames";

function id(prefix: string) {
  return `${prefix}${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function db() {
  await bootstrap();
  return getDb();
}

export async function getSettings() {
  const database = await db();
  const rows = await database
    .select({
      id: settings.id,
      baseRatePerMember: settings.baseRatePerMember,
      paymentDueDay: settings.paymentDueDay,
      paymentMethod: settings.paymentMethod,
      bankName: settings.bankName,
      bankAccountNumber: settings.bankAccountNumber,
      bankAccountName: settings.bankAccountName,
      deathPayoutAmount: settings.deathPayoutAmount,
      wardedPayoutAmount: settings.wardedPayoutAmount,
      duitnowId: settings.duitnowId,
      duitnowContentType: settings.duitnowContentType,
      updatedAt: settings.updatedAt,
      supportPhone: settings.supportPhone,
      bankVerified: settings.bankVerified,
      agreementMonth: settings.agreementMonth,
    })
    .from(settings)
    .where(eq(settings.id, 1));
  if (!rows[0]) throw new AppError("Settings are not configured.", 500);
  const policy = await policyFor(malaysiaMonth());
  return {
    ...rows[0],
    baseRatePerMember: Number(policy?.rate ?? rows[0].baseRatePerMember),
    paymentDueDay: Number(policy?.due_day ?? rows[0].paymentDueDay),
    deathPayoutAmount: Number(
      policy?.death_amount ?? rows[0].deathPayoutAmount,
    ),
    wardedPayoutAmount: Number(
      policy?.warded_amount ?? rows[0].wardedPayoutAmount,
    ),
    duitnowId: rows[0].duitnowId ?? "",
    hasDuitnowQr: Boolean(rows[0].duitnowContentType),
  };
}

export async function updateSettings(
  input: {
    baseRatePerMember: number;
    paymentDueDay: number;
    paymentMethod: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    deathPayoutAmount: number;
    wardedPayoutAmount: number;
    supportPhone?: string;
    bankVerified?: boolean;
    effectiveMonth?: string;
    agreementNote?: string;
  },
  actor?: Session,
) {
  await db();
  const effective = input.effectiveMonth || memberEffectiveMonth();
  if (effective < memberEffectiveMonth())
    throw new AppError(
      "Perubahan polisi bermula bulan depan; sejarah caruman kekal.",
    );
  await write(async (tx) => {
    await tx.execute({
      sql: "INSERT INTO contribution_policies(effective_month,rate,due_day,death_amount,warded_amount,note,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(effective_month) DO UPDATE SET rate=excluded.rate,due_day=excluded.due_day,death_amount=excluded.death_amount,warded_amount=excluded.warded_amount,note=excluded.note",
      args: [
        effective,
        input.baseRatePerMember,
        input.paymentDueDay,
        input.deathPayoutAmount,
        input.wardedPayoutAmount,
        input.agreementNote || "Persetujuan keluarga",
        nowIso(),
      ],
    });
    await tx.execute({
      sql: "UPDATE settings SET payment_method=?,bank_name=?,bank_account_number=?,bank_account_name=?,support_phone=?,updated_at=? WHERE id=1",
      args: [
        input.paymentMethod,
        input.bankName,
        input.bankAccountNumber,
        input.bankAccountName,
        input.supportPhone || "",
        nowIso(),
      ],
    });
    await tx.execute({
      sql: "UPDATE settings SET bank_verified=? WHERE id=1",
      args: [input.bankVerified ? 1 : 0],
    });
    await auditWrite(tx, actor, "Polisi bertarikh", {
      effective,
      rate: input.baseRatePerMember,
      note: input.agreementNote,
    });
  });
  return getSettings();
}

async function loadContext(familyId?: string) {
  const database = await db();
  const [setting, familyRows, memberRows, paymentRows] = await Promise.all([
    getSettings(),
    database
      .select()
      .from(families)
      .where(familyId ? eq(families.familyId, familyId) : undefined),
    database
      .select()
      .from(members)
      .where(familyId ? eq(members.familyId, familyId) : undefined),
    database
      .select()
      .from(payments)
      .where(familyId ? eq(payments.familyId, familyId) : undefined),
  ]);
  return { database, setting, familyRows, memberRows, paymentRows };
}

async function assessRow(
  family: typeof families.$inferSelect,
  memberRows: (typeof members.$inferSelect)[],
  paymentRows: (typeof payments.$inferSelect)[],
  rate: number,
  dueDay: number,
) {
  const activeCount = memberRows.filter(
    (member) =>
      member.familyId === family.familyId && member.memberStatus === "Aktif",
  ).length;
  const snapshots = await ensureAssessments(family.familyId);
  return assessFamily({
    snapshots,
    joinedMonth: family.billingStartMonth || family.joinedMonth,
    openingBalance: family.openingBalance,
    familyStatus: family.familyStatus,
    activeCount,
    rate,
    dueDay,
    payments: paymentRows.filter(
      (payment) => payment.familyId === family.familyId,
    ),
  });
}

export async function syncAllFamilies(familyId?: string) {
  const {
    database,
    setting,
    familyRows: allFamilies,
    memberRows,
    paymentRows,
  } = await loadContext(familyId);
  const familyRows = familyId
    ? allFamilies.filter((f) => f.familyId === familyId)
    : allFamilies;
  for (const family of familyRows) {
    const assessment = await assessRow(
      family,
      memberRows,
      paymentRows,
      setting.baseRatePerMember,
      setting.paymentDueDay,
    );
    if (
      family.familyStatus !== "Inactive" &&
      assessment.suggestedStatus !== family.familyStatus
    ) {
      await database
        .update(families)
        .set({ familyStatus: assessment.suggestedStatus, updatedAt: nowIso() })
        .where(eq(families.familyId, family.familyId));
      family.familyStatus = assessment.suggestedStatus;
    }
  }
  return familyRows;
}

function toMemberDto(
  member: typeof members.$inferSelect,
  familyStatus: string,
) {
  const eligibility = memberEligibility(member.memberStatus, familyStatus);
  return {
    memberId: member.memberId,
    familyId: member.familyId,
    memberName: member.memberName,
    memberStatus: member.memberStatus,
    relationship: member.relationship,
    icNumber: maskIC(member.icNumber),
    billingStartMonth: member.billingStartMonth,
    billingEndMonth: member.billingEndMonth,
    eligible: eligibility.eligible,
    eligibilityReason: eligibility.reason,
  };
}

export async function getFamilyBundle(familyId: string) {
  const database = await db();
  const setting = await getSettings();
  const familyRows = await database
    .select()
    .from(families)
    .where(eq(families.familyId, familyId));
  const family = familyRows[0];
  if (!family) throw new AppError("Family not found.", 404);
  const [memberRows, paymentRows, requestRows, claimRows, userRows] =
    await Promise.all([
      database.select().from(members).where(eq(members.familyId, familyId)),
      database
        .select()
        .from(payments)
        .where(eq(payments.familyId, familyId))
        .orderBy(desc(payments.createdAt)),
      database
        .select()
        .from(memberRequests)
        .where(eq(memberRequests.familyId, familyId))
        .orderBy(desc(memberRequests.createdAt)),
      database
        .select()
        .from(claims)
        .where(eq(claims.familyId, familyId))
        .orderBy(desc(claims.createdAt)),
      database.select().from(users).where(eq(users.familyId, familyId)),
    ]);
  const snapshots = await ensureAssessments(familyId);
  const assessment = await assessRow(
    family,
    memberRows,
    paymentRows,
    setting.baseRatePerMember,
    setting.paymentDueDay,
  );
  if (family.familyStatus !== "Inactive")
    family.familyStatus = assessment.suggestedStatus;
  return {
    snapshots,
    settings: setting,
    family: {
      familyId: family.familyId,
      wakilName: family.wakilName,
      wakilPhone: family.wakilPhone,
      familyStatus: family.familyStatus,
      joinedMonth: family.joinedMonth,
      registrationComplete: Boolean(family.registrationComplete),
      openingBalance: family.openingBalance,
      notes: family.notes,
      email: userRows[0]?.email ?? null,
      username: userRows[0]?.username ?? null,
    },
    members: memberRows.map((member) =>
      toMemberDto(member, family.familyStatus),
    ),
    payments: paymentRows.map((payment) => toPayment(payment)),
    requests: requestRows.map((r) => ({ ...r, icNumber: maskIC(r.icNumber) })),
    claims: claimRows,
    assessment,
  };
}

function toPayment(payment: typeof payments.$inferSelect, wakilName?: string) {
  return {
    paymentId: payment.paymentId,
    familyId: payment.familyId,
    wakilName: wakilName ?? null,
    paymentDate: payment.paymentDate,
    paymentMonthYear: payment.paymentMonthYear,
    amountPaid: payment.amountPaid,
    expectedAmount: payment.expectedAmount,
    transactionReference: payment.transactionReference,
    receiptUrl: payment.receiptImageUrl,
    approvalStatus: payment.approvalStatus,
    rejectionReason: payment.rejectionReason,
    reviewedBy: payment.reviewedBy,
    reviewedAt: payment.reviewedAt,
    entryNote: payment.entryNote,
    createdAt: payment.createdAt,
  };
}

export async function listDirectory(query = "") {
  const familiesLive = await syncAllFamilies();
  const { setting, memberRows, paymentRows } = await loadContext();
  const needle = query.trim().toLowerCase();
  const directory = await Promise.all(
    familiesLive.map(async (family) => {
      const familyMembers = memberRows.filter(
        (member) => member.familyId === family.familyId,
      );
      const assessment = await assessRow(
        family,
        memberRows,
        paymentRows,
        setting.baseRatePerMember,
        setting.paymentDueDay,
      );
      return {
        familyId: family.familyId,
        wakilName: family.wakilName,
        wakilPhone: family.wakilPhone,
        familyStatus: family.familyStatus,
        totalMembers: familyMembers.length,
        activeMembers: assessment.activeCount,
        monthlyDues: assessment.monthlyDues,
        arrearsAmount: assessment.arrearsAmount,
        bakiSemasa: assessment.bakiSemasa,
      };
    }),
  );
  return directory
    .filter((family) => {
      if (!needle) return true;
      return `${family.familyId} ${family.wakilName} ${family.wakilPhone}`
        .toLowerCase()
        .includes(needle);
    })
    .sort((a, b) => a.familyId.localeCompare(b.familyId));
}

export async function createFamily(
  input: {
    wakilName: string;
    wakilPhone: string;
    email?: string;
    password?: string;
    familyStatus: "Active" | "Suspended" | "Inactive";
    joinedMonth: string;
    billingStartMonth?: string;
    openingBalance: number;
    notes?: string;
  },
  actor?: Session,
) {
  if (
    input.joinedMonth > malaysiaMonth() ||
    (input.billingStartMonth &&
      (input.billingStartMonth < input.joinedMonth ||
        input.billingStartMonth > malaysiaMonth()))
  )
    throw new AppError("Semak bulan menyertai dan bulan mula kiraan.");
  if (
    input.openingBalance !== 0 &&
    actor &&
    !can(actor.accessProfile, "settings")
  )
    throw new AppError("Baki cutover memerlukan pentadbir utama.");
  await db();
  const activation = issueActivation();
  const familyId = await write(async (tx) => {
    const accounts = (await tx.execute("SELECT username FROM users")).rows;
    const username = uniqueUsername(
      input.wakilName,
      new Set(accounts.map((r) => String(r.username || ""))),
    );
    const ids = (await tx.execute("SELECT family_id FROM families")).rows;
    const max = ids.reduce(
      (m, r) =>
        /^K\d+$/.test(String(r.family_id))
          ? Math.max(m, Number(String(r.family_id).slice(1)))
          : m,
      0,
    );
    const familyId = "K" + String(max + 1).padStart(3, "0");
    const email = input.email?.toLowerCase() || username + "@wakil.invalid";
    const timestamp = nowIso();
    await tx.execute({
      sql: "INSERT INTO families(family_id,wakil_name,wakil_phone,family_status,joined_month,opening_balance,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
      args: [
        familyId,
        input.wakilName,
        input.wakilPhone,
        input.familyStatus,
        input.joinedMonth,
        input.openingBalance,
        input.notes || null,
        timestamp,
        timestamp,
      ],
    });
    await tx.execute({
      sql: "UPDATE families SET registration_complete=0 WHERE family_id=?",
      args: [familyId],
    });
    if (input.billingStartMonth)
      await tx.execute({
        sql: "UPDATE families SET billing_start_month=? WHERE family_id=?",
        args: [input.billingStartMonth, familyId],
      });
    await tx.execute({
      sql: "INSERT INTO users(id,email,username,password_hash,name,role,family_id,phone,must_change_password,activation_required,activation_hash,activation_expires,created_at) VALUES(?,?,?,?,?,'wakil',?,?,1,1,?,?,?)",
      args: [
        id("U"),
        email,
        username,
        hashPassword(DEFAULT_WAKIL_PASSWORD),
        input.wakilName,
        familyId,
        input.wakilPhone,
        activation.hash,
        activation.expires,
        timestamp,
      ],
    });
    await tx.execute({
      sql: "INSERT INTO members(member_id,family_id,member_name,member_status,relationship,billing_start_month,created_at) VALUES(?,?,?,'Aktif','Wakil',?,?)",
      args: [id("M"), familyId, input.wakilName, input.joinedMonth, timestamp],
    });
    await auditWrite(tx, actor, "Daftar keluarga", {
      familyId,
      name: input.wakilName,
      joinedMonth: input.joinedMonth,
    });
    return familyId;
  });
  return {
    ...(await getFamilyBundle(familyId)),
    activationCode: activation.code,
  };
}

export async function updateFamily(
  familyId: string,
  input: {
    wakilName: string;
    wakilPhone: string;
    email?: string;
    password?: string;
    familyStatus: "Active" | "Suspended" | "Inactive";
    joinedMonth: string;
    openingBalance: number;
    notes?: string;
  },
  actor?: Session,
) {
  await db();
  await ensureAssessments(familyId);
  if (input.password)
    throw new AppError(
      "Gunakan Accounts untuk reset password dan kod pengaktifan.",
    );
  await write(async (tx) => {
    const before = (
      await tx.execute({
        sql: "SELECT * FROM families WHERE family_id=?",
        args: [familyId],
      })
    ).rows[0];
    if (!before) throw new AppError("Keluarga tidak ditemui.", 404);
    if (
      input.openingBalance !== Number(before.opening_balance) &&
      (!actor ||
        !can(actor.accessProfile, "settings") ||
        !input.notes ||
        input.notes.length < 5)
    )
      throw new AppError(
        "Pelarasan baki asal memerlukan pentadbir utama dan alasan.",
      );
    if (input.joinedMonth !== before.joined_month)
      throw new AppError(
        "Tarikh asal tidak boleh diubah selepas assessment dijana. Gunakan pengesahan sejarah.",
      );
    await tx.execute({
      sql: "UPDATE families SET wakil_name=?,wakil_phone=?,family_status=?,opening_balance=?,notes=?,updated_at=? WHERE family_id=?",
      args: [
        input.wakilName,
        input.wakilPhone,
        input.familyStatus,
        input.openingBalance,
        input.notes || null,
        nowIso(),
        familyId,
      ],
    });
    if (input.email) {
      const primary = (
        await tx.execute({
          sql: "SELECT id FROM users WHERE family_id=? ORDER BY created_at LIMIT 1",
          args: [familyId],
        })
      ).rows[0];
      if (primary)
        await tx.execute({
          sql: "UPDATE users SET email=? WHERE id=?",
          args: [input.email!, primary.id],
        });
    }
    await auditWrite(tx, actor, "Kemaskini keluarga", {
      familyId,
      before: {
        name: before.wakil_name,
        status: before.family_status,
        balance: before.opening_balance,
      },
      after: {
        name: input.wakilName,
        status: input.familyStatus,
        balance: input.openingBalance,
      },
      note: input.notes,
    });
  });
  return getFamilyBundle(familyId);
}

export async function deleteFamily(familyId: string, actor?: Session) {
  await db();
  return write(async (tx) => {
    const financial = (
      await tx.execute({
        sql: "SELECT payment_id FROM payments WHERE family_id=? UNION ALL SELECT claim_id FROM claims WHERE family_id=?",
        args: [familyId, familyId],
      })
    ).rows;
    if (financial.length)
      throw new AppError(
        "Keluarga mempunyai rekod kewangan. Tetapkan Tidak Aktif untuk simpan sejarah.",
        409,
      );
    for (const table of [
      "monthly_assessments",
      "receipts",
      "member_requests",
      "members",
      "users",
    ])
      await tx.execute({
        sql: "DELETE FROM " + table + " WHERE family_id=?",
        args: [familyId],
      });
    const deleted = await tx.execute({
      sql: "DELETE FROM families WHERE family_id=?",
      args: [familyId],
    });
    if (!deleted.rowsAffected)
      throw new AppError("Keluarga tidak ditemui.", 404);
    await auditWrite(tx, actor, "Padam keluarga kosong", { familyId });
    return { ok: true };
  });
}

export async function createMember(
  input: {
    familyId: string;
    memberName: string;
    memberStatus: "Aktif" | "Tidak Aktif";
    relationship: string;
    icNumber?: string;
  },
  actor?: Session,
) {
  await db();
  await ensureAssessments(input.familyId);
  const memberId = id("M");
  await write(async (tx) => {
    const f = (
      await tx.execute({
        sql: "SELECT * FROM families WHERE family_id=?",
        args: [input.familyId],
      })
    ).rows[0];
    if (!f) throw new AppError("Keluarga tidak ditemui.", 404);
    await tx.execute({
      sql: "INSERT INTO members(member_id,family_id,member_name,member_status,relationship,ic_number,billing_start_month,billing_end_month,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
      args: [
        memberId,
        input.familyId,
        input.memberName,
        input.memberStatus,
        input.relationship,
        protectIC(input.icNumber),
        f.registration_complete
          ? memberEffectiveMonth()
          : String(f.joined_month),
        input.memberStatus === "Aktif" ? null : memberEffectiveMonth(),
        nowIso(),
      ],
    });
    if (!f.registration_complete)
      await tx.execute({
        sql: "UPDATE monthly_assessments SET active_count=(SELECT COUNT(*) FROM members WHERE family_id=? AND member_status='Aktif'),expected=rate*(SELECT COUNT(*) FROM members WHERE family_id=? AND member_status='Aktif') WHERE family_id=? AND confirmed=0",
        args: [input.familyId, input.familyId, input.familyId],
      });
    await auditWrite(tx, actor, "Tambah ahli", {
      memberId,
      familyId: input.familyId,
      name: input.memberName,
      effective: memberEffectiveMonth(),
    });
  });
  return memberId;
}

export async function updateMember(
  memberId: string,
  input: {
    memberName: string;
    memberStatus: "Aktif" | "Tidak Aktif";
    relationship: string;
    icNumber?: string;
  },
  actor?: Session,
) {
  const database = await db();
  const member = (
    await database.select().from(members).where(eq(members.memberId, memberId))
  )[0];
  if (!member) throw new AppError("Ahli tidak ditemui.", 404);
  await ensureAssessments(member.familyId);
  await write(async (tx) => {
    await tx.execute({
      sql: "UPDATE members SET member_name=?,relationship=?,ic_number=?,member_status=? WHERE member_id=?",
      args: [
        input.memberName,
        input.relationship,
        input.icNumber?.includes("•") || input.icNumber === undefined
          ? member.icNumber
          : protectIC(input.icNumber),
        input.memberStatus,
        memberId,
      ],
    });
    if (member.memberStatus !== input.memberStatus) {
      if (input.memberStatus === "Tidak Aktif")
        await tx.execute({
          sql: "UPDATE members SET billing_start_month=COALESCE(billing_start_month,?),billing_end_month=? WHERE member_id=?",
          args: [malaysiaMonth(), memberEffectiveMonth(), memberId],
        });
      else
        await tx.execute({
          sql: "UPDATE members SET billing_start_month=?,billing_end_month=NULL WHERE member_id=?",
          args: [memberEffectiveMonth(), memberId],
        });
    }
    await auditWrite(tx, actor, "Kemaskini ahli", {
      memberId,
      before: { name: member.memberName, status: member.memberStatus },
      after: { name: input.memberName, status: input.memberStatus },
      effective: memberEffectiveMonth(),
    });
  });
  return member.familyId;
}

export async function deleteMember(memberId: string, actor?: Session) {
  const database = await db();
  const m = (
    await database.select().from(members).where(eq(members.memberId, memberId))
  )[0];
  if (!m) throw new AppError("Ahli tidak ditemui.", 404);
  await updateMember(
    memberId,
    {
      memberName: m.memberName,
      memberStatus: "Tidak Aktif",
      relationship: m.relationship,
      icNumber: m.icNumber || undefined,
    },
    actor,
  );
  return m.familyId;
}

export async function createMemberRequest(
  input: {
    familyId: string;
    memberName: string;
    relationship: string;
    icNumber?: string;
    note?: string;
  },
  actor?: Session,
) {
  await db();
  const requestId = id("Q");
  await write(async (tx) => {
    const f = (
      await tx.execute({
        sql: "SELECT family_id FROM families WHERE family_id=?",
        args: [input.familyId],
      })
    ).rows[0];
    if (!f) throw new AppError("Keluarga tidak ditemui.", 404);
    await tx.execute({
      sql: "INSERT INTO member_requests(request_id,family_id,member_name,relationship,ic_number,status,note,created_at) VALUES(?,?,?,?,?,'Pending',?,?)",
      args: [
        requestId,
        input.familyId,
        input.memberName,
        input.relationship,
        protectIC(input.icNumber),
        input.note || null,
        nowIso(),
      ],
    });
    await auditWrite(tx, actor, "Permohonan ahli", {
      requestId,
      familyId: input.familyId,
      name: input.memberName,
    });
  });
  return requestId;
}

export async function listMemberRequests(status?: string) {
  const database = await db();
  const rows = await database
    .select()
    .from(memberRequests)
    .orderBy(desc(memberRequests.createdAt));
  const familyRows = await database.select().from(families);
  const names = new Map(
    familyRows.map((family) => [family.familyId, family.wakilName]),
  );
  return rows
    .filter((row) => (status ? row.status === status : true))
    .map((row) => ({
      ...row,
      icNumber: maskIC(row.icNumber),
      wakilName: names.get(row.familyId) ?? "",
    }));
}

export async function reviewMemberRequest(
  requestId: string,
  decision: "Approved" | "Rejected",
  actor?: Session,
) {
  await db();
  return write(async (tx) => {
    const rows = await tx.execute({
      sql: "UPDATE member_requests SET status=?,reviewed_at=? WHERE request_id=? AND status='Pending' RETURNING *",
      args: [decision, nowIso(), requestId],
    });
    const request = rows.rows[0];
    if (!request) throw new AppError("Permohonan telah disemak.", 409);
    if (decision === "Approved")
      await tx.execute({
        sql: "INSERT INTO members(member_id,family_id,member_name,member_status,relationship,ic_number,billing_start_month,created_at) VALUES(?,?,?,'Aktif',?,?,?,?)",
        args: [
          id("M"),
          request.family_id,
          request.member_name,
          request.relationship,
          request.ic_number,
          memberEffectiveMonth(),
          nowIso(),
        ],
      });
    await auditWrite(tx, actor, "Semakan ahli", { requestId, decision });
    return String(request.family_id);
  });
}

export async function saveReceipt(
  familyId: string,
  contentType: string,
  base64: string,
) {
  const database = await db();
  const family = await database
    .select()
    .from(families)
    .where(eq(families.familyId, familyId));
  if (!family[0]) throw new AppError("Family not found.", 404);
  const receiptId = id("R");
  await database.insert(receipts).values({
    receiptId,
    familyId,
    contentType,
    imageData: base64,
    createdAt: nowIso(),
  });
  return { receiptId, url: `/api/receipts/${receiptId}` };
}

export async function getReceipt(receiptId: string) {
  const database = await db();
  const rows = await database
    .select()
    .from(receipts)
    .where(eq(receipts.receiptId, receiptId));
  if (!rows[0]) throw new AppError("Receipt not found.", 404);
  return rows[0];
}

export async function createPayment(
  input: {
    familyId: string;
    paymentMonthYear: string;
    amountPaid: number;
    transactionReference: string;
    receiptId: string;
  },
  session: Session,
) {
  return insertPayment(
    { ...input, paymentDate: todayDate(), markApproved: false },
    session,
  );
}
async function insertPayment(
  input: {
    familyId: string;
    paymentMonthYear: string;
    amountPaid: number;
    transactionReference: string;
    receiptId?: string;
    paymentDate: string;
    markApproved: boolean;
    entryNote?: string;
  },
  session: Session,
) {
  await db();
  const bundle = await getFamilyBundle(input.familyId);
  if (bundle.family.familyStatus === "Inactive")
    throw new AppError("Keluarga tidak aktif.");
  if (
    input.paymentDate > todayDate() ||
    input.paymentMonthYear < bundle.family.joinedMonth ||
    input.paymentMonthYear > malaysiaMonth()
  )
    throw new AppError("Semak tarikh dan bulan bayaran.");
  const month = bundle.assessment.months.find(
    (r) => r.month === input.paymentMonthYear,
  );
  if (!month) throw new AppError("Bulan tidak ditemui.");
  if (month.settled)
    throw new AppError(
      "Bulan ini sudah selesai. Pilih bulan yang masih berbaki.",
      409,
    );
  if (input.markApproved && !can(session.accessProfile, "approve"))
    throw new AppError(
      "Akaun ini hanya boleh memasukkan bayaran untuk semakan.",
      403,
    );
  const paymentId = id("P");
  await write(async (tx) => {
    const opening = (
      await tx.execute("SELECT date FROM fund_entries WHERE kind='Opening'")
    ).rows[0];
    if (opening && input.paymentDate <= String(opening.date))
      throw new AppError(
        "Transaksi sebelum baki bank asal tidak boleh dikira dua kali. Semak tarikh cutover.",
      );
    const duplicate = (
      await tx.execute({
        sql: "SELECT payment_id FROM payments WHERE lower(trim(transaction_reference))=lower(trim(?)) AND approval_status!='Rejected'",
        args: [input.transactionReference],
      })
    ).rows;
    if (duplicate.length)
      throw new AppError(
        "Rujukan transaksi sudah digunakan. Semak rekod untuk mengelakkan bayaran dua kali.",
        409,
      );
    const pending = (
      await tx.execute({
        sql: "SELECT payment_id FROM payments WHERE family_id=? AND payment_month_year=? AND approval_status='Pending'",
        args: [input.familyId, input.paymentMonthYear],
      })
    ).rows;
    if (pending.length)
      throw new AppError("Bukti untuk bulan ini sedang disemak.", 409);
    if (input.receiptId) {
      const receipt = (
        await tx.execute({
          sql: "SELECT * FROM receipts WHERE receipt_id=? AND family_id=?",
          args: [input.receiptId, input.familyId],
        })
      ).rows[0];
      if (!receipt) throw new AppError("Resit bukan milik keluarga ini.", 403);
      const used = (
        await tx.execute({
          sql: "SELECT p.payment_id FROM payments p JOIN receipts r ON p.receipt_image_url='/api/receipts/'||r.receipt_id WHERE r.image_data=? AND p.approval_status!='Rejected'",
          args: [receipt.image_data],
        })
      ).rows;
      if (used.length) throw new AppError("Imej resit sudah digunakan.", 409);
    }
    await tx.execute({
      sql: "INSERT INTO payments(payment_id,family_id,payment_date,payment_month_year,amount_paid,expected_amount,transaction_reference,receipt_image_url,approval_status,reviewed_by,reviewed_at,submitted_by,entry_note,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      args: [
        paymentId,
        input.familyId,
        input.paymentDate,
        input.paymentMonthYear,
        input.amountPaid,
        month.expected,
        input.transactionReference.trim(),
        input.receiptId ? "/api/receipts/" + input.receiptId : null,
        input.markApproved ? "Approved" : "Pending",
        input.markApproved ? session.name : null,
        input.markApproved ? nowIso() : null,
        session.sub,
        input.entryNote || null,
        nowIso(),
      ],
    });
    await auditWrite(tx, session, "Rekod bayaran", {
      paymentId,
      familyId: input.familyId,
      month: input.paymentMonthYear,
      amount: input.amountPaid,
      source:
        session.role === "admin" ? "Resit WhatsApp / manual" : "Portal wakil",
    });
  });
  return getPayment(paymentId);
}

export async function listPayments(filters: {
  familyId?: string;
  status?: string;
}) {
  const database = await db();
  const paymentRows = await database
    .select()
    .from(payments)
    .where(
      and(
        filters.familyId ? eq(payments.familyId, filters.familyId) : undefined,
        filters.status
          ? eq(payments.approvalStatus, filters.status)
          : undefined,
      ),
    )
    .orderBy(desc(payments.createdAt));
  const familyRows = await database
    .select()
    .from(families)
    .where(
      filters.familyId ? eq(families.familyId, filters.familyId) : undefined,
    );
  const names = new Map(
    familyRows.map((family) => [family.familyId, family.wakilName]),
  );
  return paymentRows
    .filter((payment) =>
      filters.familyId ? payment.familyId === filters.familyId : true,
    )
    .filter((payment) =>
      filters.status ? payment.approvalStatus === filters.status : true,
    )
    .map((payment) => toPayment(payment, names.get(payment.familyId)));
}

export async function getPayment(paymentId: string) {
  const database = await db();
  const rows = await database
    .select()
    .from(payments)
    .where(eq(payments.paymentId, paymentId));
  const payment = rows[0];
  if (!payment) throw new AppError("Payment not found.", 404);
  const familyRows = await database
    .select()
    .from(families)
    .where(eq(families.familyId, payment.familyId));
  return {
    ...toPayment(payment, familyRows[0]?.wakilName),
    familyStatus: familyRows[0]?.familyStatus ?? null,
    wakilPhone: familyRows[0]?.wakilPhone ?? null,
  };
}

async function reviewPayment(
  paymentId: string,
  status: "Approved" | "Rejected",
  adminName: string,
  reason?: string,
  actor?: Session,
) {
  await db();
  const result = await write(async (tx) => {
    const rows = await tx.execute({
      sql: "UPDATE payments SET approval_status=?,rejection_reason=?,reviewed_by=?,reviewed_at=? WHERE payment_id=? AND approval_status='Pending' RETURNING family_id",
      args: [status, reason || null, adminName, nowIso(), paymentId],
    });
    if (!rows.rows.length)
      throw new AppError(
        "Bayaran telah disemak oleh AJK lain. Muat semula.",
        409,
      );
    await auditWrite(tx, actor, "Semakan bayaran", {
      paymentId,
      status,
      reason,
    });
    return String(rows.rows[0].family_id);
  });
  const updated = await getFamilyBundle(result);
  return {
    payment: await getPayment(paymentId),
    balance: {
      bakiAwal: updated.assessment.bakiAwal,
      bakiSemasa: updated.assessment.bakiSemasa,
      familyStatus: updated.family.familyStatus,
      statusChanged: false,
    },
  };
}

export function approvePayment(
  paymentId: string,
  adminName: string,
  actor?: Session,
) {
  return reviewPayment(paymentId, "Approved", adminName, undefined, actor);
}

export function rejectPayment(
  paymentId: string,
  adminName: string,
  reason: string,
  actor?: Session,
) {
  return reviewPayment(paymentId, "Rejected", adminName, reason, actor);
}

export async function deletePayment(paymentId: string, actor?: Session) {
  await db();
  return write(async (tx) => {
    const result = await tx.execute({
      sql: "DELETE FROM payments WHERE payment_id=? AND approval_status='Pending' RETURNING family_id",
      args: [paymentId],
    });
    if (!result.rows.length)
      throw new AppError("Hanya bayaran belum disemak boleh dibuang.", 409);
    await auditWrite(tx, actor, "Padam bayaran belum disemak", { paymentId });
    return { ok: true, familyId: String(result.rows[0].family_id) };
  });
}

export async function createClaim(
  input: {
    familyId: string;
    memberId: string;
    claimDate: string;
    claimType: "Death" | "Warded";
    amount: number;
    notes?: string;
    recipientName: string;
    recipientAccount: string;
    receiptId: string;
    eventReference?: string;
    exceptionReason?: string;
  },
  adminName: string,
  actor?: Session,
) {
  await db();
  const bundle = await getFamilyBundle(input.familyId);
  if (
    input.claimDate > todayDate() ||
    input.claimDate.slice(0, 7) < bundle.family.joinedMonth
  )
    throw new AppError(
      "Tarikh kejadian mesti selepas menyertai dan bukan masa depan.",
    );
  const policy = await policyFor(input.claimDate.slice(0, 7));
  if (!policy)
    throw new AppError(
      "Polisi bagi tarikh lama belum disahkan. Rekod dan sahkan polisi sejarah dahulu.",
    );
  const amount = Number(
    input.claimType === "Death" ? policy.death_amount : policy.warded_amount,
  );
  if (
    input.amount !== amount &&
    (!input.exceptionReason || input.exceptionReason.length < 5)
  )
    throw new AppError(
      "Nyatakan alasan pengecualian kadar yang dipersetujui keluarga.",
    );
  const claimId = id("C");
  await write(async (tx) => {
    const member = (
      await tx.execute({
        sql: "SELECT * FROM members WHERE member_id=? AND family_id=?",
        args: [input.memberId, input.familyId],
      })
    ).rows[0];
    const death = (
      await tx.execute({
        sql: "SELECT claim_id FROM claims WHERE member_id=? AND claim_type='Death' AND status IN ('Reviewed','Approved','Paid') AND claim_date<=?",
        args: [input.memberId, input.claimDate],
      })
    ).rows;
    if (input.claimType === "Warded" && death.length)
      throw new AppError(
        "Kejadian wad mesti sebelum tarikh kematian yang disahkan.",
      );
    if (
      !member ||
      (member.member_status !== "Aktif" &&
        (!member.billing_end_month ||
          String(member.billing_end_month) <= input.claimDate.slice(0, 7)))
    )
      throw new AppError("Ahli mesti aktif dan dalam keluarga ini.");
    if (
      member.billing_start_month &&
      String(member.billing_start_month) > input.claimDate.slice(0, 7)
    )
      throw new AppError("Ahli belum menyertai pada tarikh kejadian.");
    const billing = (
      await tx.execute({
        sql: "SELECT * FROM monthly_assessments WHERE family_id=? AND month<=? ORDER BY month",
        args: [input.familyId, input.claimDate.slice(0, 7)],
      })
    ).rows;
    if (billing.some((r) => !r.confirmed))
      throw new AppError(
        "Sahkan rekod caruman sejarah sebelum menilai tuntutan.",
      );
    const rawPayments = (
      await tx.execute({
        sql: "SELECT * FROM payments WHERE family_id=? AND approval_status='Approved' AND payment_date<=?",
        args: [input.familyId, input.claimDate],
      })
    ).rows;
    const eventAssessment = assessFamily({
      joinedMonth: bundle.family.joinedMonth,
      openingBalance: bundle.family.openingBalance,
      familyStatus:
        bundle.family.familyStatus === "Inactive" ? "Inactive" : "Active",
      activeCount: bundle.assessment.activeCount,
      rate: bundle.settings.baseRatePerMember,
      dueDay: bundle.settings.paymentDueDay,
      now: new Date(input.claimDate + "T12:00:00+08:00"),
      snapshots: billing.map((r) => ({
        month: String(r.month),
        expected: Number(r.expected),
        activeCount: Number(r.active_count),
        rate: Number(r.rate),
        dueDay: Number(r.due_day),
        confirmed: Boolean(r.confirmed),
        source: String(r.source),
      })),
      payments: rawPayments.map((r) => ({
        paymentMonthYear: String(r.payment_month_year),
        amountPaid: Number(r.amount_paid),
        expectedAmount: Number(r.expected_amount),
        approvalStatus: "Approved",
      })),
    });
    if (
      eventAssessment.shouldSuspend ||
      eventAssessment.suggestedStatus === "Inactive"
    )
      throw new AppError("Keluarga tidak layak pada tarikh kejadian.", 403);
    const receipt = (
      await tx.execute({
        sql: "SELECT receipt_id FROM receipts WHERE receipt_id=? AND family_id=?",
        args: [input.receiptId, input.familyId],
      })
    ).rows[0];
    if (!receipt)
      throw new AppError(
        "Upload bukti kematian / kemasukan wad kritikal bagi keluarga ini.",
      );
    const key =
      input.claimType === "Death"
        ? input.memberId + ":Death"
        : input.memberId +
          ":Warded:" +
          (input.eventReference || input.claimDate).trim().toLowerCase();
    const prior = (
      await tx.execute({
        sql: "SELECT claim_id FROM claims WHERE member_id=? AND claim_type=? AND status!='Rejected' AND (claim_type='Death' OR claim_date=?)",
        args: [input.memberId, input.claimType, input.claimDate],
      })
    ).rows;
    if (prior.length)
      throw new AppError("Tuntutan kejadian ini sudah direkod.", 409);
    await tx.execute({
      sql: "INSERT INTO claims(claim_id,family_id,member_id,claim_date,claim_type,amount,notes,created_by,created_at,status,recipient_name,recipient_account,evidence_url,event_key,policy_amount,exception_reason) VALUES(?,?,?,?,?,?,?,?,?,'Submitted',?,?,?,?,?,?)",
      args: [
        claimId,
        input.familyId,
        input.memberId,
        input.claimDate,
        input.claimType,
        input.amount,
        input.notes || null,
        adminName,
        nowIso(),
        input.recipientName,
        input.recipientAccount,
        "/api/receipts/" + input.receiptId,
        key,
        amount,
        input.exceptionReason || null,
      ],
    });
    await auditWrite(tx, actor, "Permohonan tuntutan", {
      claimId,
      type: input.claimType,
      amount: input.amount,
      date: input.claimDate,
    });
  });
  return claimId;
}

export async function getStatement(familyId: string, year: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2099)
    throw new AppError("Choose a valid report year.");
  const bundle = await getFamilyBundle(familyId);
  const rows = buildMonthRows({
    joinedMonth: bundle.family.joinedMonth,
    fromMonth: bundle.family.joinedMonth,
    toMonth: `${year}-12`,
    activeCount: bundle.assessment.activeCount,
    rate: bundle.settings.baseRatePerMember,
    payments: bundle.payments,
    snapshots: bundle.snapshots,
    openingBalance: bundle.family.openingBalance,
    now: new Date(),
    dueDay: bundle.settings.paymentDueDay,
  });
  return {
    ...bundle,
    year,
    rows: rows.filter((row) => row.month.startsWith(String(year))),
  };
}

export async function getFinancialReport(year: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2099)
    throw new AppError("Pilih tahun laporan yang sah.");
  await syncAllFamilies();
  const database = await db(),
    setting = await getSettings();
  const [paymentRows, billing, fund, arrears] = await Promise.all([
    database.select().from(payments),
    getClient().execute("SELECT * FROM monthly_assessments"),
    fundSummary(),
    getArrears(),
  ]);
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const month = year + "-" + String(i + 1).padStart(2, "0");
    return {
      month,
      expected: billing.rows
        .filter((r) => r.month === month)
        .reduce((n, r) => n + Number(r.expected), 0),
      collected: paymentRows
        .filter(
          (p) =>
            p.approvalStatus === "Approved" && p.paymentMonthYear === month,
        )
        .reduce((n, p) => n + p.amountPaid, 0),
      cashReceived: paymentRows
        .filter(
          (p) =>
            p.approvalStatus === "Approved" && p.paymentDate.startsWith(month),
        )
        .reduce((n, p) => n + p.amountPaid, 0),
      unconfirmed: billing.rows.filter((r) => r.month === month && !r.confirmed)
        .length,
    };
  });
  return {
    year,
    totalFundBalance: fund.balance,
    collectedAll: fund.collected,
    paidOut: fund.paid,
    fund,
    monthly,
    yearExpected: monthly.reduce((n, r) => n + r.expected, 0),
    yearCollected: monthly.reduce((n, r) => n + r.collected, 0),
    overdueFamilies: arrears.length,
    settings: setting,
  };
}

export async function getArrears() {
  const directory = await listDirectory();
  const { setting, memberRows, paymentRows, familyRows } = await loadContext();
  return (
    await Promise.all(
      directory
        .filter(
          (family) =>
            family.arrearsAmount > 0.009 && family.familyStatus !== "Inactive",
        )
        .map(async (family) => {
          const source = familyRows.find(
            (row) => row.familyId === family.familyId,
          )!;
          const assessment = await assessRow(
            source,
            memberRows,
            paymentRows,
            setting.baseRatePerMember,
            setting.paymentDueDay,
          );
          return {
            ...family,
            overdueMonths: assessment.overdueMonths.map((row) => row.month),
            consecutiveUnpaid: assessment.consecutiveUnpaid,
            bakiAwal: assessment.bakiAwal,
          };
        }),
    )
  ).sort((a, b) => b.arrearsAmount - a.arrearsAmount);
}

export async function getAdminDashboard() {
  const directory = await listDirectory();
  const paymentRows = await listPayments({});
  const requests = await listMemberRequests("Pending");
  const report = await getFinancialReport(Number(malaysiaMonth().slice(0, 4)));
  const pending = paymentRows.filter(
    (payment) => payment.approvalStatus === "Pending",
  );
  return {
    families: directory.length,
    activeFamilies: directory.filter(
      (family) => family.familyStatus === "Active",
    ).length,
    suspendedFamilies: directory.filter(
      (family) => family.familyStatus === "Suspended",
    ).length,
    overdueFamilies: directory.filter(
      (family) =>
        family.arrearsAmount > 0.009 && family.familyStatus !== "Inactive",
    ).length,
    pendingCount: pending.length,
    pending: pending.slice(0, 6),
    requestCount: requests.length,
    totalFundBalance: report.totalFundBalance,
    yearCollected: report.yearCollected,
    yearExpected: report.yearExpected,
  };
}

export async function findUserByEmail(email: string) {
  const database = await db();
  const rows = await database
    .select()
    .from(users)
    .where(
      sql`lower(${users.email}) = ${email.toLowerCase()} OR lower(${users.username}) = ${email.toLowerCase()}`,
    );
  return rows[0] ?? null;
}

export async function accountIsActive(userId: string) {
  const database = await db();
  const rows = await database
    .select({ active: users.active })
    .from(users)
    .where(eq(users.id, userId));
  return Boolean(rows[0] && rows[0].active !== 0);
}

export async function listAccounts() {
  const database = await db();
  const userRows = await database.select().from(users);
  const familyRows = await database.select().from(families);
  const names = new Map(
    familyRows.map((family) => [family.familyId, family.wakilName]),
  );
  return userRows
    .map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      mustChangePassword: Boolean(user.mustChangePassword),
      accessProfile: user.accessProfile,
      activationRequired: Boolean(user.activationRequired),
      name: user.name,
      role: user.role,
      familyId: user.familyId,
      familyLabel: user.familyId ? (names.get(user.familyId) ?? null) : null,
      phone: user.phone,
      active: user.active !== 0,
    }))
    .sort(
      (a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name),
    );
}

export async function createAdminAccount(
  input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    accessProfile?: string;
    delegateFamilyId?: string;
  },
  actor?: Session,
) {
  await db();
  const activation = issueActivation();
  const userId = id("U");
  await write(async (tx) => {
    if (input.delegateFamilyId) {
      const family = (
        await tx.execute({
          sql: "SELECT family_id FROM families WHERE family_id=?",
          args: [input.delegateFamilyId],
        })
      ).rows[0];
      if (!family) throw new AppError("Keluarga tidak ditemui.");
    }
    const names = (await tx.execute("SELECT username FROM users")).rows;
    const username = uniqueUsername(
      input.name,
      new Set(names.map((r) => String(r.username || ""))),
    );
    await tx.execute({
      sql: "INSERT INTO users(id,username,email,password_hash,name,role,family_id,phone,active,access_profile,must_change_password,activation_required,activation_hash,activation_expires,created_at) VALUES(?,?,?,?,?,?,?,?,1,?,1,?,?,?,?)",
      args: [
        userId,
        username,
        input.email.trim().toLowerCase() || username + "@wakil.invalid",
        hashPassword(
          input.delegateFamilyId ? DEFAULT_WAKIL_PASSWORD : input.password,
        ),
        input.name,
        input.delegateFamilyId ? "wakil" : "admin",
        input.delegateFamilyId || null,
        input.phone || null,
        input.accessProfile || "treasurer",
        input.delegateFamilyId ? 1 : 0,
        input.delegateFamilyId ? activation.hash : null,
        input.delegateFamilyId ? activation.expires : null,
        nowIso(),
      ],
    });
    await auditWrite(tx, actor, "Cipta akaun", {
      userId,
      profile: input.accessProfile,
      delegateFamilyId: input.delegateFamilyId,
    });
  });
  return {
    id: userId,
    activationCode: input.delegateFamilyId ? activation.code : undefined,
  };
}

export async function updateAccount(
  actorId: string,
  userId: string,
  input: {
    name?: string;
    password?: string;
    phone?: string;
    active?: boolean;
    resetDefault?: boolean;
    issueActivation?: boolean;
    accessProfile?: string;
  },
) {
  await db();
  const activation = issueActivation();
  return write(async (tx) => {
    const user = (
      await tx.execute({
        sql: "SELECT * FROM users WHERE id=?",
        args: [userId],
      })
    ).rows[0];
    if (!user) throw new AppError("Akaun tidak ditemui.", 404);
    if (
      userId === actorId &&
      (input.active === false ||
        (input.accessProfile && input.accessProfile !== "owner"))
    )
      throw new AppError(
        "Anda tidak boleh membuang kuasa atau menyahaktifkan akaun sendiri.",
      );
    if (
      user.role === "admin" &&
      user.access_profile === "owner" &&
      (input.active === false ||
        (input.accessProfile && input.accessProfile !== "owner"))
    ) {
      const owners = (
        await tx.execute(
          "SELECT id FROM users WHERE role='admin' AND access_profile='owner' AND active=1",
        )
      ).rows;
      if (owners.length <= 1)
        throw new AppError("Kekalkan sekurang-kurangnya satu pentadbir utama.");
    }
    if (input.resetDefault && user.role !== "wakil")
      throw new AppError("Password default hanya untuk wakil.");
    if (input.name)
      await tx.execute({
        sql: "UPDATE users SET name=? WHERE id=?",
        args: [input.name, userId],
      });
    if (input.phone !== undefined)
      await tx.execute({
        sql: "UPDATE users SET phone=? WHERE id=?",
        args: [input.phone, userId],
      });
    if (input.active !== undefined)
      await tx.execute({
        sql: "UPDATE users SET active=?,session_version=session_version+1 WHERE id=?",
        args: [input.active ? 1 : 0, userId],
      });
    if (input.accessProfile && user.role === "admin")
      await tx.execute({
        sql: "UPDATE users SET access_profile=?,session_version=session_version+1 WHERE id=?",
        args: [input.accessProfile, userId],
      });
    if (input.resetDefault || input.password)
      await tx.execute({
        sql: "UPDATE users SET password_hash=?,must_change_password=1,session_version=session_version+1 WHERE id=?",
        args: [
          hashPassword(
            input.resetDefault ? DEFAULT_WAKIL_PASSWORD : input.password!,
          ),
          userId,
        ],
      });
    const activate =
      user.role === "wakil" && (input.resetDefault || input.issueActivation);
    if (activate)
      await tx.execute({
        sql: "UPDATE users SET activation_required=1,activation_hash=?,activation_expires=?,session_version=session_version+1 WHERE id=?",
        args: [activation.hash, activation.expires, userId],
      });
    const actor = (
      await tx.execute({
        sql: "SELECT name FROM users WHERE id=?",
        args: [actorId],
      })
    ).rows[0];
    await auditWrite(
      tx,
      { sub: actorId, name: String(actor?.name || "AJK") },
      "Kemaskini akaun",
      {
        userId,
        name: input.name,
        active: input.active,
        profile: input.accessProfile,
        passwordReset: Boolean(input.resetDefault || input.password),
        activationIssued: Boolean(activate),
      },
    );
    return {
      role: user.role === "admin" ? "Admin" : "Wakil",
      activationCode: activate ? activation.code : undefined,
    };
  });
}

export async function saveDuitnow(
  input: {
    duitnowId: string;
    contentType?: string;
    imageBase64?: string;
    removeImage?: boolean;
  },
  actor?: Session,
) {
  await db();
  await write(async (tx) => {
    await tx.execute({
      sql: "UPDATE settings SET duitnow_id=?,updated_at=? WHERE id=1",
      args: [input.duitnowId || null, nowIso()],
    });
    if (input.removeImage)
      await tx.execute(
        "UPDATE settings SET duitnow_qr=NULL,duitnow_content_type=NULL WHERE id=1",
      );
    else if (input.imageBase64 && input.contentType)
      await tx.execute({
        sql: "UPDATE settings SET duitnow_qr=?,duitnow_content_type=? WHERE id=1",
        args: [input.imageBase64, input.contentType],
      });
    await auditWrite(tx, actor, "DuitNow", {
      id: input.duitnowId,
      qrChanged: Boolean(input.imageBase64 || input.removeImage),
    });
  });
  return getSettings();
}

export async function getDuitnowQr() {
  const database = await db();
  const rows = await database
    .select({
      image: settings.duitnowQr,
      contentType: settings.duitnowContentType,
    })
    .from(settings)
    .where(eq(settings.id, 1));
  return rows[0] ?? null;
}

export async function recordManualPayment(
  input: {
    familyId: string;
    paymentMonthYear: string;
    amountPaid: number;
    transactionReference: string;
    paymentDate: string;
    markApproved: boolean;
    entryNote?: string;
    receiptId?: string;
  },
  session: Session,
) {
  return insertPayment(input, session);
}

export async function recordActivity(
  session: Session,
  action: string,
  detail: string,
) {
  const database = await db();
  await database.insert(activityLog).values({
    id: id("A"),
    actorId: session.sub,
    actorName: session.name,
    action,
    detail,
    createdAt: nowIso(),
  });
}

export async function listActivity(query = "", page = 1) {
  const database = await db();
  return database
    .select()
    .from(activityLog)
    .where(
      sql`${activityLog.action} LIKE ${"%" + query + "%"} OR ${activityLog.detail} LIKE ${"%" + query + "%"} OR ${activityLog.actorName} LIKE ${"%" + query + "%"}`,
    )
    .orderBy(desc(activityLog.createdAt))
    .limit(80)
    .offset((page - 1) * 80);
}

export type FamilyBundle = Awaited<ReturnType<typeof getFamilyBundle>>;
export type AssessmentDto = Assessment;
