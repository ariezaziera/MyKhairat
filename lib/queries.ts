import { randomBytes } from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import { assessFamily, buildMonthRows, memberEligibility, monthKey, type Assessment } from "./business";
import { bootstrap } from "./bootstrap";
import { getDb } from "./db";
import { nowIso, todayDate } from "./format";
import { AppError } from "./guard";
import { hashPassword } from "./passwords";
import { activityLog, claims, families, memberRequests, members, payments, receipts, settings, users } from "./schema";
import type { Session } from "./auth-token";

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
    })
    .from(settings)
    .where(eq(settings.id, 1));
  if (!rows[0]) throw new AppError("Settings are not configured.", 500);
  return {
    ...rows[0],
    duitnowId: rows[0].duitnowId ?? "",
    hasDuitnowQr: Boolean(rows[0].duitnowContentType),
  };
}

export async function updateSettings(input: {
  baseRatePerMember: number;
  paymentDueDay: number;
  paymentMethod: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  deathPayoutAmount: number;
  wardedPayoutAmount: number;
}) {
  const database = await db();
  await database
    .update(settings)
    .set({ ...input, updatedAt: nowIso() })
    .where(eq(settings.id, 1));
  await syncAllFamilies();
  return getSettings();
}

async function loadContext() {
  const database = await db();
  const [setting, familyRows, memberRows, paymentRows] = await Promise.all([
    getSettings(),
    database.select().from(families),
    database.select().from(members),
    database.select().from(payments),
  ]);
  return { database, setting, familyRows, memberRows, paymentRows };
}

function assessRow(
  family: typeof families.$inferSelect,
  memberRows: (typeof members.$inferSelect)[],
  paymentRows: (typeof payments.$inferSelect)[],
  rate: number,
  dueDay: number,
) {
  const activeCount = memberRows.filter((member) => member.familyId === family.familyId && member.memberStatus === "Aktif").length;
  return assessFamily({
    joinedMonth: family.joinedMonth,
    openingBalance: family.openingBalance,
    familyStatus: family.familyStatus,
    activeCount,
    rate,
    dueDay,
    payments: paymentRows.filter((payment) => payment.familyId === family.familyId),
  });
}

export async function syncAllFamilies() {
  const { database, setting, familyRows, memberRows, paymentRows } = await loadContext();
  for (const family of familyRows) {
    const assessment = assessRow(family, memberRows, paymentRows, setting.baseRatePerMember, setting.paymentDueDay);
    if (family.familyStatus !== "Inactive" && assessment.suggestedStatus !== family.familyStatus) {
      await database
        .update(families)
        .set({ familyStatus: assessment.suggestedStatus, updatedAt: nowIso() })
        .where(eq(families.familyId, family.familyId));
      family.familyStatus = assessment.suggestedStatus;
    }
  }
  return familyRows;
}

async function nextFamilyId() {
  const database = await db();
  const rows = await database.select({ familyId: families.familyId }).from(families);
  const max = rows.reduce((highest, row) => {
    const value = Number(row.familyId.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);
  return `K${String(max + 1).padStart(3, "0")}`;
}

function toMemberDto(member: typeof members.$inferSelect, familyStatus: string) {
  const eligibility = memberEligibility(member.memberStatus, familyStatus);
  return {
    memberId: member.memberId,
    familyId: member.familyId,
    memberName: member.memberName,
    memberStatus: member.memberStatus,
    relationship: member.relationship,
    icNumber: member.icNumber,
    eligible: eligibility.eligible,
    eligibilityReason: eligibility.reason,
  };
}

export async function getFamilyBundle(familyId: string) {
  await syncAllFamilies();
  const database = await db();
  const setting = await getSettings();
  const familyRows = await database.select().from(families).where(eq(families.familyId, familyId));
  const family = familyRows[0];
  if (!family) throw new AppError("Family not found.", 404);
  const [memberRows, paymentRows, requestRows, claimRows, userRows] = await Promise.all([
    database.select().from(members).where(eq(members.familyId, familyId)),
    database.select().from(payments).where(eq(payments.familyId, familyId)).orderBy(desc(payments.createdAt)),
    database.select().from(memberRequests).where(eq(memberRequests.familyId, familyId)).orderBy(desc(memberRequests.createdAt)),
    database.select().from(claims).where(eq(claims.familyId, familyId)).orderBy(desc(claims.createdAt)),
    database.select().from(users).where(eq(users.familyId, familyId)),
  ]);
  const assessment = assessRow(family, memberRows, paymentRows, setting.baseRatePerMember, setting.paymentDueDay);
  return {
    settings: setting,
    family: {
      familyId: family.familyId,
      wakilName: family.wakilName,
      wakilPhone: family.wakilPhone,
      familyStatus: family.familyStatus,
      joinedMonth: family.joinedMonth,
      openingBalance: family.openingBalance,
      notes: family.notes,
      email: userRows[0]?.email ?? null,
    },
    members: memberRows.map((member) => toMemberDto(member, family.familyStatus)),
    payments: paymentRows.map((payment) => toPayment(payment)),
    requests: requestRows,
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
  return familiesLive
    .map((family) => {
      const familyMembers = memberRows.filter((member) => member.familyId === family.familyId);
      const assessment = assessRow(family, memberRows, paymentRows, setting.baseRatePerMember, setting.paymentDueDay);
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
    })
    .filter((family) => {
      if (!needle) return true;
      return `${family.familyId} ${family.wakilName} ${family.wakilPhone}`.toLowerCase().includes(needle);
    })
    .sort((a, b) => a.familyId.localeCompare(b.familyId));
}

export async function createFamily(input: {
  wakilName: string;
  wakilPhone: string;
  email: string;
  password: string;
  familyStatus: "Active" | "Suspended" | "Inactive";
  joinedMonth: string;
  openingBalance: number;
  notes?: string;
}) {
  const database = await db();
  const email = input.email.toLowerCase();
  const existing = await database.select().from(users).where(sql`lower(${users.email}) = ${email}`);
  if (existing.length) throw new AppError("That email is already registered.");
  const familyId = await nextFamilyId();
  const timestamp = nowIso();
  await database.insert(families).values({
    familyId,
    wakilName: input.wakilName,
    wakilPhone: input.wakilPhone,
    familyStatus: input.familyStatus,
    joinedMonth: input.joinedMonth,
    openingBalance: input.openingBalance,
    notes: input.notes || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await database.insert(users).values({
    id: id("U"),
    email,
    passwordHash: hashPassword(input.password),
    name: input.wakilName,
    role: "wakil",
    familyId,
    phone: input.wakilPhone,
    createdAt: timestamp,
  });
  await syncAllFamilies();
  return getFamilyBundle(familyId);
}

export async function updateFamily(
  familyId: string,
  input: {
    wakilName: string;
    wakilPhone: string;
    email: string;
    password?: string;
    familyStatus: "Active" | "Suspended" | "Inactive";
    joinedMonth: string;
    openingBalance: number;
    notes?: string;
  },
) {
  const database = await db();
  const current = await database.select().from(families).where(eq(families.familyId, familyId));
  if (!current[0]) throw new AppError("Family not found.", 404);
  const email = input.email.toLowerCase();
  const emailOwner = await database.select().from(users).where(sql`lower(${users.email}) = ${email}`);
  if (emailOwner[0] && emailOwner[0].familyId !== familyId) throw new AppError("That email is already registered.");
  const timestamp = nowIso();
  await database
    .update(families)
    .set({
      wakilName: input.wakilName,
      wakilPhone: input.wakilPhone,
      familyStatus: input.familyStatus,
      joinedMonth: input.joinedMonth,
      openingBalance: input.openingBalance,
      notes: input.notes || null,
      updatedAt: timestamp,
    })
    .where(eq(families.familyId, familyId));
  const linked = await database.select().from(users).where(eq(users.familyId, familyId));
  if (linked[0]) {
    await database
      .update(users)
      .set({
        email,
        name: input.wakilName,
        phone: input.wakilPhone,
        ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
      })
      .where(eq(users.id, linked[0].id));
  }
  await syncAllFamilies();
  return getFamilyBundle(familyId);
}

export async function deleteFamily(familyId: string) {
  const database = await db();
  const current = await database.select().from(families).where(eq(families.familyId, familyId));
  if (!current[0]) throw new AppError("Family not found.", 404);
  await database.delete(claims).where(eq(claims.familyId, familyId));
  await database.delete(payments).where(eq(payments.familyId, familyId));
  await database.delete(receipts).where(eq(receipts.familyId, familyId));
  await database.delete(memberRequests).where(eq(memberRequests.familyId, familyId));
  await database.delete(members).where(eq(members.familyId, familyId));
  await database.delete(users).where(eq(users.familyId, familyId));
  await database.delete(families).where(eq(families.familyId, familyId));
  return { ok: true };
}

export async function createMember(input: {
  familyId: string;
  memberName: string;
  memberStatus: "Aktif" | "Tidak Aktif";
  relationship: string;
  icNumber?: string;
}) {
  const database = await db();
  const family = await database.select().from(families).where(eq(families.familyId, input.familyId));
  if (!family[0]) throw new AppError("Family not found.", 404);
  const memberId = id("M");
  await database.insert(members).values({
    memberId,
    familyId: input.familyId,
    memberName: input.memberName,
    memberStatus: input.memberStatus,
    relationship: input.relationship,
    icNumber: input.icNumber || null,
    createdAt: nowIso(),
  });
  await syncAllFamilies();
  return memberId;
}

export async function updateMember(
  memberId: string,
  input: { memberName: string; memberStatus: "Aktif" | "Tidak Aktif"; relationship: string; icNumber?: string },
) {
  const database = await db();
  const rows = await database.select().from(members).where(eq(members.memberId, memberId));
  if (!rows[0]) throw new AppError("Member not found.", 404);
  await database
    .update(members)
    .set({
      memberName: input.memberName,
      memberStatus: input.memberStatus,
      relationship: input.relationship,
      icNumber: input.icNumber || null,
    })
    .where(eq(members.memberId, memberId));
  await syncAllFamilies();
  return rows[0].familyId;
}

export async function deleteMember(memberId: string) {
  const database = await db();
  const rows = await database.select().from(members).where(eq(members.memberId, memberId));
  if (!rows[0]) throw new AppError("Member not found.", 404);
  await database.delete(claims).where(eq(claims.memberId, memberId));
  await database.delete(members).where(eq(members.memberId, memberId));
  await syncAllFamilies();
  return rows[0].familyId;
}

export async function createMemberRequest(input: {
  familyId: string;
  memberName: string;
  relationship: string;
  icNumber?: string;
  note?: string;
}) {
  const database = await db();
  const family = await database.select().from(families).where(eq(families.familyId, input.familyId));
  if (!family[0]) throw new AppError("Family not found.", 404);
  const requestId = id("Q");
  await database.insert(memberRequests).values({
    requestId,
    familyId: input.familyId,
    memberName: input.memberName,
    relationship: input.relationship,
    icNumber: input.icNumber || null,
    status: "Pending",
    note: input.note || null,
    createdAt: nowIso(),
    reviewedAt: null,
  });
  return requestId;
}

export async function listMemberRequests(status?: string) {
  const database = await db();
  const rows = await database.select().from(memberRequests).orderBy(desc(memberRequests.createdAt));
  const familyRows = await database.select().from(families);
  const names = new Map(familyRows.map((family) => [family.familyId, family.wakilName]));
  return rows
    .filter((row) => (status ? row.status === status : true))
    .map((row) => ({ ...row, wakilName: names.get(row.familyId) ?? "" }));
}

export async function reviewMemberRequest(requestId: string, decision: "Approved" | "Rejected") {
  const database = await db();
  const rows = await database.select().from(memberRequests).where(eq(memberRequests.requestId, requestId));
  const request = rows[0];
  if (!request) throw new AppError("Request not found.", 404);
  if (request.status !== "Pending") throw new AppError("This request has already been reviewed.");
  const timestamp = nowIso();
  if (decision === "Approved") {
    await createMember({
      familyId: request.familyId,
      memberName: request.memberName,
      memberStatus: "Aktif",
      relationship: request.relationship,
      icNumber: request.icNumber ?? undefined,
    });
  }
  await database
    .update(memberRequests)
    .set({ status: decision, reviewedAt: timestamp })
    .where(eq(memberRequests.requestId, requestId));
  return request.familyId;
}

export async function saveReceipt(familyId: string, contentType: string, base64: string) {
  const database = await db();
  const family = await database.select().from(families).where(eq(families.familyId, familyId));
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
  const rows = await database.select().from(receipts).where(eq(receipts.receiptId, receiptId));
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
  const database = await db();
  const bundle = await getFamilyBundle(input.familyId);
  if (bundle.family.familyStatus === "Inactive") {
    throw new AppError("Inactive families cannot submit payments.");
  }
  const current = monthKey(new Date());
  if (input.paymentMonthYear < bundle.family.joinedMonth || input.paymentMonthYear > current) {
    throw new AppError("Choose a payment month from the month the family joined through the current month.");
  }
  const pending = bundle.payments.find(
    (payment) => payment.paymentMonthYear === input.paymentMonthYear && payment.approvalStatus === "Pending",
  );
  if (pending) throw new AppError("A payment for this month is already pending review.");
  const receipt = await getReceipt(input.receiptId);
  if (receipt.familyId !== input.familyId) throw new AppError("That receipt does not belong to this family.", 403);
  const paymentId = id("P");
  const timestamp = nowIso();
  await database.insert(payments).values({
    paymentId,
    familyId: input.familyId,
    paymentDate: todayDate(),
    paymentMonthYear: input.paymentMonthYear,
    amountPaid: input.amountPaid,
    expectedAmount: bundle.assessment.monthlyDues,
    transactionReference: input.transactionReference,
    receiptImageUrl: `/api/receipts/${input.receiptId}`,
    approvalStatus: "Pending",
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    submittedBy: session.sub,
    createdAt: timestamp,
  });
  return getPayment(paymentId);
}

export async function listPayments(filters: { familyId?: string; status?: string }) {
  const database = await db();
  const paymentRows = await database.select().from(payments).orderBy(desc(payments.createdAt));
  const familyRows = await database.select().from(families);
  const names = new Map(familyRows.map((family) => [family.familyId, family.wakilName]));
  return paymentRows
    .filter((payment) => (filters.familyId ? payment.familyId === filters.familyId : true))
    .filter((payment) => (filters.status ? payment.approvalStatus === filters.status : true))
    .map((payment) => toPayment(payment, names.get(payment.familyId)));
}

export async function getPayment(paymentId: string) {
  await syncAllFamilies();
  const database = await db();
  const rows = await database.select().from(payments).where(eq(payments.paymentId, paymentId));
  const payment = rows[0];
  if (!payment) throw new AppError("Payment not found.", 404);
  const familyRows = await database.select().from(families).where(eq(families.familyId, payment.familyId));
  return {
    ...toPayment(payment, familyRows[0]?.wakilName),
    familyStatus: familyRows[0]?.familyStatus ?? null,
    wakilPhone: familyRows[0]?.wakilPhone ?? null,
  };
}

async function reviewPayment(paymentId: string, status: "Approved" | "Rejected", adminName: string, reason?: string) {
  const database = await db();
  const rows = await database.select().from(payments).where(eq(payments.paymentId, paymentId));
  const payment = rows[0];
  if (!payment) throw new AppError("Payment not found.", 404);
  if (payment.approvalStatus !== "Pending") throw new AppError("Only pending payments can be reviewed.");
  await database
    .update(payments)
    .set({
      approvalStatus: status,
      rejectionReason: reason ?? null,
      reviewedBy: adminName,
      reviewedAt: nowIso(),
    })
    .where(eq(payments.paymentId, paymentId));
  const before = payment.familyId;
  const familiesBefore = await database.select().from(families).where(eq(families.familyId, before));
  const previousStatus = familiesBefore[0]?.familyStatus;
  await syncAllFamilies();
  const updated = await getFamilyBundle(payment.familyId);
  const record = await getPayment(paymentId);
  return {
    payment: record,
    balance: {
      bakiAwal: updated.assessment.bakiAwal,
      bakiSemasa: updated.assessment.bakiSemasa,
      familyStatus: updated.family.familyStatus,
      statusChanged: previousStatus !== updated.family.familyStatus,
    },
  };
}

export function approvePayment(paymentId: string, adminName: string) {
  return reviewPayment(paymentId, "Approved", adminName);
}

export function rejectPayment(paymentId: string, adminName: string, reason: string) {
  return reviewPayment(paymentId, "Rejected", adminName, reason);
}

export async function deletePayment(paymentId: string) {
  const database = await db();
  const rows = await database.select().from(payments).where(eq(payments.paymentId, paymentId));
  if (!rows[0]) throw new AppError("Payment not found.", 404);
  if (rows[0].approvalStatus !== "Pending") throw new AppError("Only pending payments can be deleted.");
  await database.delete(payments).where(eq(payments.paymentId, paymentId));
  return { ok: true, familyId: rows[0].familyId };
}

export async function createClaim(
  input: { familyId: string; memberId: string; claimDate: string; claimType: "Death" | "Warded"; amount: number; notes?: string },
  adminName: string,
) {
  await syncAllFamilies();
  const database = await db();
  const memberRows = await database.select().from(members).where(eq(members.memberId, input.memberId));
  const member = memberRows[0];
  if (!member || member.familyId !== input.familyId) throw new AppError("Member not found.", 404);
  const familyRows = await database.select().from(families).where(eq(families.familyId, input.familyId));
  const family = familyRows[0];
  if (!family) throw new AppError("Family not found.", 404);
  const eligibility = memberEligibility(member.memberStatus, family.familyStatus);
  if (!eligibility.eligible) throw new AppError(eligibility.reason, 403);
  if (input.claimType === "Death") {
    const prior = await database.select().from(claims).where(eq(claims.memberId, input.memberId));
    if (prior.some((claim) => claim.claimType === "Death")) {
      throw new AppError("A death claim has already been recorded for this member.");
    }
  }
  const claimId = id("C");
  await database.insert(claims).values({
    claimId,
    familyId: input.familyId,
    memberId: input.memberId,
    claimDate: input.claimDate,
    claimType: input.claimType,
    amount: input.amount,
    notes: input.notes || null,
    createdBy: adminName,
    createdAt: nowIso(),
  });
  if (input.claimType === "Death") {
    await database.update(members).set({ memberStatus: "Tidak Aktif" }).where(eq(members.memberId, input.memberId));
    await syncAllFamilies();
  }
  return claimId;
}

export async function getStatement(familyId: string, year: number) {
  const bundle = await getFamilyBundle(familyId);
  const rows = buildMonthRows({
    joinedMonth: bundle.family.joinedMonth,
    fromMonth: `${year}-01`,
    toMonth: `${year}-12`,
    activeCount: bundle.assessment.activeCount,
    rate: bundle.settings.baseRatePerMember,
    payments: bundle.payments,
    now: new Date(),
    dueDay: bundle.settings.paymentDueDay,
  });
  return { ...bundle, year, rows };
}

export async function getFinancialReport(year: number) {
  const familiesLive = await syncAllFamilies();
  const { setting, memberRows, paymentRows } = await loadContext();
  const database = await db();
  const claimRows = await database.select().from(claims);
  const collectedAll = paymentRows
    .filter((payment) => payment.approvalStatus === "Approved")
    .reduce((sum, payment) => sum + payment.amountPaid, 0);
  const paidOut = claimRows.reduce((sum, claim) => sum + claim.amount, 0);
  const months = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
  const currentMonth = monthKey(new Date());
  const monthly = months.map((month) => {
    let expected = 0;
    if (month <= currentMonth) {
      for (const family of familiesLive) {
        if (family.familyStatus === "Inactive" || family.joinedMonth > month) continue;
        const activeCount = memberRows.filter((member) => member.familyId === family.familyId && member.memberStatus === "Aktif").length;
        expected += activeCount * setting.baseRatePerMember;
      }
    }
    const collected = paymentRows
      .filter((payment) => payment.paymentMonthYear === month && payment.approvalStatus === "Approved")
      .reduce((sum, payment) => sum + payment.amountPaid, 0);
    return {
      month,
      expected: Math.round(expected * 100) / 100,
      collected: Math.round(collected * 100) / 100,
    };
  });
  const arrears = await getArrears();
  return {
    year,
    totalFundBalance: Math.round((collectedAll - paidOut) * 100) / 100,
    collectedAll: Math.round(collectedAll * 100) / 100,
    paidOut: Math.round(paidOut * 100) / 100,
    monthly,
    yearExpected: Math.round(monthly.reduce((sum, row) => sum + row.expected, 0) * 100) / 100,
    yearCollected: Math.round(monthly.reduce((sum, row) => sum + row.collected, 0) * 100) / 100,
    overdueFamilies: arrears.length,
    settings: setting,
  };
}

export async function getArrears() {
  const directory = await listDirectory();
  const { setting, memberRows, paymentRows, familyRows } = await loadContext();
  return directory
    .filter((family) => family.arrearsAmount > 0.009 && family.familyStatus !== "Inactive")
    .map((family) => {
      const source = familyRows.find((row) => row.familyId === family.familyId)!;
      const assessment = assessRow(source, memberRows, paymentRows, setting.baseRatePerMember, setting.paymentDueDay);
      return {
        ...family,
        overdueMonths: assessment.overdueMonths.map((row) => row.month),
        consecutiveUnpaid: assessment.consecutiveUnpaid,
        bakiAwal: assessment.bakiAwal,
      };
    })
    .sort((a, b) => b.arrearsAmount - a.arrearsAmount);
}

export async function getAdminDashboard() {
  const directory = await listDirectory();
  const paymentRows = await listPayments({});
  const requests = await listMemberRequests("Pending");
  const report = await getFinancialReport(new Date().getFullYear());
  const pending = paymentRows.filter((payment) => payment.approvalStatus === "Pending");
  return {
    families: directory.length,
    activeFamilies: directory.filter((family) => family.familyStatus === "Active").length,
    suspendedFamilies: directory.filter((family) => family.familyStatus === "Suspended").length,
    overdueFamilies: directory.filter((family) => family.arrearsAmount > 0.009 && family.familyStatus !== "Inactive").length,
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
  const rows = await database.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
  return rows[0] ?? null;
}

export async function accountIsActive(userId: string) {
  const database = await db();
  const rows = await database.select({ active: users.active }).from(users).where(eq(users.id, userId));
  return Boolean(rows[0] && rows[0].active !== 0);
}

export async function listAccounts() {
  const database = await db();
  const userRows = await database.select().from(users);
  const familyRows = await database.select().from(families);
  const names = new Map(familyRows.map((family) => [family.familyId, family.wakilName]));
  return userRows
    .map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      familyId: user.familyId,
      familyLabel: user.familyId ? (names.get(user.familyId) ?? null) : null,
      phone: user.phone,
      active: user.active !== 0,
    }))
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
}

export async function createAdminAccount(input: { name: string; email: string; password: string; phone?: string }) {
  const database = await db();
  const existing = await findUserByEmail(input.email);
  if (existing) throw new AppError("An account with that email already exists.");
  const userId = id("U");
  await database.insert(users).values({
    id: userId,
    email: input.email.trim().toLowerCase(),
    passwordHash: hashPassword(input.password),
    name: input.name,
    role: "admin",
    familyId: null,
    phone: input.phone || null,
    active: 1,
    createdAt: nowIso(),
  });
  return userId;
}

export async function updateAccount(
  actorId: string,
  userId: string,
  input: { name?: string; password?: string; phone?: string; active?: boolean },
) {
  const database = await db();
  const rows = await database.select().from(users).where(eq(users.id, userId));
  const user = rows[0];
  if (!user) throw new AppError("Account not found.", 404);
  if (input.active === false && userId === actorId) throw new AppError("You cannot disable your own login.");
  if (input.active === false && user.role === "admin" && user.active !== 0) {
    const admins = await database.select().from(users).where(eq(users.role, "admin"));
    if (admins.filter((row) => row.active !== 0).length <= 1) throw new AppError("Keep at least one active AJK admin.");
  }
  await database
    .update(users)
    .set({
      ...(input.name ? { name: input.name } : {}),
      ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.active === undefined ? {} : { active: input.active ? 1 : 0 }),
    })
    .where(eq(users.id, userId));
  return { role: user.role === "admin" ? "Admin" : "Wakil" };
}

export async function saveDuitnow(input: {
  duitnowId: string;
  contentType?: string;
  imageBase64?: string;
  removeImage?: boolean;
}) {
  const database = await db();
  const patch: {
    duitnowId: string | null;
    updatedAt: string;
    duitnowQr?: string | null;
    duitnowContentType?: string | null;
  } = {
    duitnowId: input.duitnowId || null,
    updatedAt: nowIso(),
  };
  if (input.removeImage) {
    patch.duitnowQr = null;
    patch.duitnowContentType = null;
  } else if (input.imageBase64 && input.contentType) {
    patch.duitnowQr = input.imageBase64;
    patch.duitnowContentType = input.contentType;
  }
  await database.update(settings).set(patch).where(eq(settings.id, 1));
  return getSettings();
}

export async function getDuitnowQr() {
  const database = await db();
  const rows = await database
    .select({ image: settings.duitnowQr, contentType: settings.duitnowContentType })
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
  },
  session: Session,
) {
  const database = await db();
  const bundle = await getFamilyBundle(input.familyId);
  if (bundle.family.familyStatus === "Inactive") throw new AppError("Inactive families cannot receive new payments.");
  const current = monthKey(new Date());
  if (input.paymentMonthYear < bundle.family.joinedMonth || input.paymentMonthYear > current) {
    throw new AppError("Choose a payment month from the month the family joined through the current month.");
  }
  const pending = bundle.payments.find(
    (payment) => payment.paymentMonthYear === input.paymentMonthYear && payment.approvalStatus === "Pending",
  );
  if (pending) throw new AppError("A payment for this month is already pending review.");
  const paymentId = id("P");
  const timestamp = nowIso();
  await database.insert(payments).values({
    paymentId,
    familyId: input.familyId,
    paymentDate: input.paymentDate,
    paymentMonthYear: input.paymentMonthYear,
    amountPaid: input.amountPaid,
    expectedAmount: bundle.assessment.monthlyDues,
    transactionReference: input.transactionReference,
    receiptImageUrl: null,
    approvalStatus: input.markApproved ? "Approved" : "Pending",
    rejectionReason: null,
    reviewedBy: input.markApproved ? session.name : null,
    reviewedAt: input.markApproved ? timestamp : null,
    submittedBy: session.sub,
    entryNote: input.entryNote || null,
    createdAt: timestamp,
  });
  if (input.markApproved) await syncAllFamilies();
  return getPayment(paymentId);
}

export async function recordActivity(session: Session, action: string, detail: string) {
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

export async function listActivity() {
  const database = await db();
  return database.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(80);
}

export type FamilyBundle = Awaited<ReturnType<typeof getFamilyBundle>>;
export type AssessmentDto = Assessment;
