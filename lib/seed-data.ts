import { sql } from "drizzle-orm";
import { addMonths, assessFamily, isMonthClosed, listMonths, monthKey } from "./business";
import { getDb } from "./db";
import { nowIso, todayDate } from "./format";
import { hashPassword } from "./passwords";
import { families, memberRequests, members, payments, receipts, users } from "./schema";

function receiptImage(title: string, amount: string, reference: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="860">
    <rect width="640" height="860" fill="#f7f8fa"/>
    <rect x="40" y="40" width="560" height="780" rx="24" fill="#ffffff" stroke="#d9dee7"/>
    <circle cx="320" cy="150" r="46" fill="#007BFF"/>
    <path d="M300 150h40M320 130v40" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
    <text x="320" y="240" text-anchor="middle" font-family="Arial" font-size="28" fill="#1A2332">DuitNow Transfer</text>
    <text x="320" y="280" text-anchor="middle" font-family="Arial" font-size="18" fill="#667085">${title}</text>
    <text x="320" y="390" text-anchor="middle" font-family="Arial" font-size="48" font-weight="700" fill="#28A745">${amount}</text>
    <text x="320" y="450" text-anchor="middle" font-family="Arial" font-size="18" fill="#667085">Successful</text>
    <text x="120" y="540" font-family="Arial" font-size="18" fill="#667085">Reference</text>
    <text x="120" y="572" font-family="Arial" font-size="22" fill="#1A2332">${reference}</text>
    <text x="120" y="640" font-family="Arial" font-size="18" fill="#667085">Recipient</text>
    <text x="120" y="672" font-family="Arial" font-size="22" fill="#1A2332">Tabung Khairat Kematian</text>
    <text x="120" y="740" font-family="Arial" font-size="18" fill="#667085">Maybank 512345678901</text>
  </svg>`;
  return Buffer.from(svg).toString("base64");
}

type SeedMember = {
  id: string;
  name: string;
  status: "Aktif" | "Tidak Aktif";
  relationship: string;
};

type SeedFamily = {
  familyId: string;
  wakilName: string;
  phone: string;
  email: string;
  joinedMonth: string;
  openingBalance: number;
  activeCount: number;
  rate: number;
  members: SeedMember[];
  skipMonths: string[];
  pendingMonth?: string;
};

export async function seedIfEmpty() {
  const database = getDb();
  const existing = await database.select({ n: sql<number>`count(*)` }).from(users);
  if (Number(existing[0]?.n ?? 0) > 0) return { seeded: false };

  const now = new Date();
  const dueDay = 7;
  const rate = 5;
  const current = monthKey(now);
  const joinedMonth = addMonths(current, -8);
  const lastClosed = isMonthClosed(current, now, dueDay) ? current : addMonths(current, -1);
  const closedMonths = listMonths(joinedMonth, lastClosed);
  const timestamp = nowIso();
  const passwordHash = hashPassword("Wakil@12345");

  const familiesSeed: SeedFamily[] = [
    {
      familyId: "K001",
      wakilName: "Siti Aminah binti Rahman",
      phone: "0123456789",
      email: "siti@mykhairat.my",
      joinedMonth,
      openingBalance: 0,
      activeCount: 4,
      rate,
      skipMonths: [],
      members: [
        { id: "M1001", name: "Siti Aminah binti Rahman", status: "Aktif", relationship: "Wakil" },
        { id: "M1002", name: "Ahmad bin Rahman", status: "Aktif", relationship: "Suami" },
        { id: "M1003", name: "Nurul Izzah binti Ahmad", status: "Aktif", relationship: "Anak" },
        { id: "M1004", name: "Adam bin Ahmad", status: "Aktif", relationship: "Anak" },
        { id: "M1005", name: "Fatimah binti Rahman", status: "Tidak Aktif", relationship: "Ibu" },
      ],
    },
    {
      familyId: "K002",
      wakilName: "Razak bin Osman",
      phone: "0129876543",
      email: "razak@mykhairat.my",
      joinedMonth,
      openingBalance: 0,
      activeCount: 3,
      rate,
      skipMonths: [lastClosed],
      members: [
        { id: "M2001", name: "Razak bin Osman", status: "Aktif", relationship: "Wakil" },
        { id: "M2002", name: "Salmah binti Yusof", status: "Aktif", relationship: "Isteri" },
        { id: "M2003", name: "Danish bin Razak", status: "Aktif", relationship: "Anak" },
      ],
    },
    {
      familyId: "K003",
      wakilName: "Hafizah binti Ali",
      phone: "0134567890",
      email: "hafizah@mykhairat.my",
      joinedMonth,
      openingBalance: 0,
      activeCount: 5,
      rate,
      skipMonths: closedMonths.slice(-3),
      members: [
        { id: "M3001", name: "Hafizah binti Ali", status: "Aktif", relationship: "Wakil" },
        { id: "M3002", name: "Kamal bin Hassan", status: "Aktif", relationship: "Suami" },
        { id: "M3003", name: "Aisyah binti Kamal", status: "Aktif", relationship: "Anak" },
        { id: "M3004", name: "Imran bin Kamal", status: "Aktif", relationship: "Anak" },
        { id: "M3005", name: "Sofea binti Kamal", status: "Aktif", relationship: "Anak" },
      ],
    },
    {
      familyId: "K004",
      wakilName: "Noraini binti Musa",
      phone: "0145678901",
      email: "noraini@mykhairat.my",
      joinedMonth,
      openingBalance: 0,
      activeCount: 2,
      rate,
      skipMonths: [],
      pendingMonth: current,
      members: [
        { id: "M4001", name: "Noraini binti Musa", status: "Aktif", relationship: "Wakil" },
        { id: "M4002", name: "Farid bin Musa", status: "Aktif", relationship: "Adik" },
      ],
    },
    {
      familyId: "K005",
      wakilName: "Ismail bin Hassan",
      phone: "0167890123",
      email: "ismail@mykhairat.my",
      joinedMonth,
      openingBalance: 10,
      activeCount: 6,
      rate,
      skipMonths: closedMonths.slice(-2),
      members: [
        { id: "M5001", name: "Ismail bin Hassan", status: "Aktif", relationship: "Wakil" },
        { id: "M5002", name: "Rohaya binti Ahmad", status: "Aktif", relationship: "Isteri" },
        { id: "M5003", name: "Haziq bin Ismail", status: "Aktif", relationship: "Anak" },
        { id: "M5004", name: "Nadia binti Ismail", status: "Aktif", relationship: "Anak" },
        { id: "M5005", name: "Puteri binti Ismail", status: "Aktif", relationship: "Anak" },
        { id: "M5006", name: "Hakim bin Ismail", status: "Aktif", relationship: "Anak" },
      ],
    },
  ];

  await database.insert(users).values({
    id: "UADMIN",
    email: "admin@mykhairat.my",
    passwordHash: hashPassword("Admin@12345"),
    name: "AJK Admin",
    role: "admin",
    familyId: null,
    phone: "0190000000",
    createdAt: timestamp,
  });

  let paymentNumber = 1000;
  for (const family of familiesSeed) {
    const dues = family.activeCount * family.rate;
    const paymentLites = closedMonths
      .filter((month) => !family.skipMonths.includes(month))
      .map((month) => ({ paymentMonthYear: month, amountPaid: dues, approvalStatus: "Approved" }));
    const assessment = assessFamily({
      joinedMonth: family.joinedMonth,
      openingBalance: family.openingBalance,
      familyStatus: "Active",
      activeCount: family.activeCount,
      rate: family.rate,
      dueDay,
      payments: paymentLites,
      now,
    });
    await database.insert(families).values({
      familyId: family.familyId,
      wakilName: family.wakilName,
      wakilPhone: family.phone,
      familyStatus: assessment.suggestedStatus,
      joinedMonth: family.joinedMonth,
      openingBalance: family.openingBalance,
      notes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await database.insert(users).values({
      id: `U${family.familyId}`,
      email: family.email,
      passwordHash,
      name: family.wakilName,
      role: "wakil",
      familyId: family.familyId,
      phone: family.phone,
      createdAt: timestamp,
    });
    await database.insert(members).values(
      family.members.map((member) => ({
        memberId: member.id,
        familyId: family.familyId,
        memberName: member.name,
        memberStatus: member.status,
        relationship: member.relationship,
        icNumber: null,
        createdAt: timestamp,
      })),
    );
    const receiptId = `R${family.familyId}`;
    await database.insert(receipts).values({
      receiptId,
      familyId: family.familyId,
      contentType: "image/svg+xml",
      imageData: receiptImage(family.wakilName, `RM ${dues.toFixed(2)}`, `KH-${family.familyId}`),
      createdAt: timestamp,
    });
    const paymentRows: (typeof payments.$inferInsert)[] = paymentLites.map((payment) => {
      paymentNumber += 1;
      return {
        paymentId: `P${paymentNumber}`,
        familyId: family.familyId,
        paymentDate: `${payment.paymentMonthYear}-08`,
        paymentMonthYear: payment.paymentMonthYear,
        amountPaid: payment.amountPaid,
        expectedAmount: dues,
        transactionReference: `KH${family.familyId}${payment.paymentMonthYear.replace("-", "")}`,
        receiptImageUrl: `/api/receipts/${receiptId}`,
        approvalStatus: "Approved",
        rejectionReason: null,
        reviewedBy: "AJK Admin",
        reviewedAt: timestamp,
        submittedBy: `U${family.familyId}`,
        createdAt: timestamp,
      };
    });
    if (family.familyId === "K001" && lastClosed) {
      paymentNumber += 1;
      paymentRows.push({
        paymentId: `P${paymentNumber}`,
        familyId: family.familyId,
        paymentDate: `${lastClosed}-06`,
        paymentMonthYear: lastClosed,
        amountPaid: dues,
        expectedAmount: dues,
        transactionReference: "REJECTEDREF01",
        receiptImageUrl: `/api/receipts/${receiptId}`,
        approvalStatus: "Rejected",
        rejectionReason: "Receipt amount does not match the transfer reference.",
        reviewedBy: "AJK Admin",
        reviewedAt: timestamp,
        submittedBy: `U${family.familyId}`,
        createdAt: timestamp,
      });
    }
    if (family.pendingMonth) {
      paymentNumber += 1;
      paymentRows.push({
        paymentId: `P${paymentNumber}`,
        familyId: family.familyId,
        paymentDate: todayDate(),
        paymentMonthYear: family.pendingMonth,
        amountPaid: dues,
        expectedAmount: dues,
        transactionReference: `PENDING${family.familyId}`,
        receiptImageUrl: `/api/receipts/${receiptId}`,
        approvalStatus: "Pending",
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
        submittedBy: `U${family.familyId}`,
        createdAt: timestamp,
      });
    }
    if (paymentRows.length) await database.insert(payments).values(paymentRows);
  }

  await database.insert(memberRequests).values({
    requestId: "Q1001",
    familyId: "K001",
    memberName: "Hana binti Ahmad",
    relationship: "Anak",
    icNumber: null,
    status: "Pending",
    note: "Newborn dependent reported by the wakil.",
    createdAt: timestamp,
    reviewedAt: null,
  });

  return { seeded: true };
}
