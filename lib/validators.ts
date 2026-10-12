import { z } from "zod";
const cents = (v: number) =>
  Number.isFinite(v) && Math.abs(v * 100 - Math.round(v * 100)) < 0.000001;

const month = z
  .string()
  .regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/, "Use a valid month");
const calendarDate = z
  .string()
  .regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Use a valid calendar date");

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Masukkan username atau email").max(120),
  activationCode: z.string().trim().max(20).optional(),
  password: z.string().min(6, "Password sekurang-kurangnya 6 aksara").max(80),
});

export const settingsSchema = z.object({
  bankVerified: z.boolean().default(false),
  supportPhone: z.string().trim().max(20).default(""),
  effectiveMonth: month.optional(),
  agreementNote: z.string().trim().max(500).default("Persetujuan keluarga"),
  baseRatePerMember: z.coerce
    .number()
    .positive("Base rate must be greater than 0")
    .refine(cents, "Gunakan maksimum 2 tempat perpuluhan."),
  paymentDueDay: z.coerce.number().int().min(1).max(28),
  paymentMethod: z.string().trim().min(2).max(80),
  bankName: z.string().trim().min(2).max(80),
  bankAccountNumber: z.string().trim().min(5).max(40),
  bankAccountName: z.string().trim().min(2).max(120),
  deathPayoutAmount: z.coerce
    .number()
    .positive("Death lump sum must be greater than 0")
    .refine(cents, "Gunakan maksimum 2 tempat perpuluhan."),
  wardedPayoutAmount: z.coerce
    .number()
    .positive("Warded lump sum must be greater than 0")
    .refine(cents, "Gunakan maksimum 2 tempat perpuluhan."),
});

export const familyCreateSchema = z.object({
  wakilName: z.string().trim().min(2).max(120),
  wakilPhone: z.string().trim().min(8).max(20),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  password: z.string().optional(),
  familyStatus: z.enum(["Active", "Suspended", "Inactive"]),
  joinedMonth: month,
  billingStartMonth: z.union([month, z.literal("")]).optional(),
  openingBalance: z.coerce
    .number()
    .finite()
    .refine(cents, "Baki mesti dalam ringgit dan sen."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const familyUpdateSchema = familyCreateSchema.extend({
  password: z.union([z.string().min(6).max(80), z.literal("")]).optional(),
});

export const memberSchema = z.object({
  familyId: z.string().trim().min(2),
  memberName: z.string().trim().min(2).max(120),
  memberStatus: z.enum(["Aktif", "Tidak Aktif"]),
  relationship: z.string().trim().min(2).max(40),
  icNumber: z.string().trim().max(20).optional().or(z.literal("")),
});

export const memberRequestSchema = z.object({
  familyId: z.string().trim().min(2),
  memberName: z.string().trim().min(2).max(120),
  relationship: z.string().trim().min(2).max(40),
  icNumber: z.string().trim().max(20).optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const paymentSchema = z.object({
  familyId: z.string().trim().min(2),
  paymentMonthYear: month,
  amountPaid: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .refine(cents, "Gunakan maksimum 2 tempat perpuluhan."),
  transactionReference: z.string().trim().min(4).max(64),
  receiptId: z.string().trim().min(4),
});

export const rejectSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export const claimSchema = z
  .object({
    familyId: z.string().trim().min(2),
    memberId: z.string().trim().min(2),
    claimDate: calendarDate,
    claimType: z.enum(["Death", "Warded"]),
    eventReference: z.string().trim().max(80).optional(),
    recipientName: z.string().trim().min(2).max(120),
    recipientAccount: z.string().trim().min(5).max(80),
    receiptId: z.string().min(2),
    exceptionReason: z.string().trim().max(500).optional(),
    amount: z.coerce
      .number()
      .positive()
      .refine(cents, "Jumlah mesti dalam ringgit dan sen."),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine(
    (v) =>
      v.claimType !== "Warded" ||
      Boolean(v.eventReference && v.eventReference.length >= 3),
    { message: "Rujukan episod kemasukan wad diperlukan." },
  );

export const duitnowSchema = z.object({
  duitnowId: z.string().trim().max(40).optional().or(z.literal("")),
  dataUrl: z.string().optional().or(z.literal("")),
  removeImage: z.boolean().optional(),
});

export const adminAccountSchema = z
  .object({
    accessProfile: z
      .enum(["owner", "treasurer", "approver", "auditor"])
      .default("treasurer"),
    delegateFamilyId: z.string().max(40).optional(),
    name: z.string().trim().min(2).max(120),
    email: z.union([z.string().trim().email(), z.literal("")]),
    password: z.string().min(8).max(80),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
  })
  .refine((v) => Boolean(v.delegateFamilyId) || Boolean(v.email), {
    message: "Email diperlukan untuk AJK.",
  });

export const accountUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  password: z.union([z.string().min(8).max(80), z.literal("")]).optional(),
  phone: z.string().trim().max(20).optional(),
  active: z.boolean().optional(),
  resetDefault: z.boolean().optional(),
  issueActivation: z.boolean().optional(),
  accessProfile: z
    .enum(["owner", "treasurer", "approver", "auditor"])
    .optional(),
});

export const manualPaymentSchema = z.object({
  receiptId: z.string().max(40).optional(),
  familyId: z.string().trim().min(2),
  paymentMonthYear: month,
  amountPaid: z.coerce.number().positive("Amount must be greater than 0"),
  transactionReference: z.string().trim().min(2).max(64),
  paymentDate: calendarDate,
  markApproved: z.boolean(),
  entryNote: z.string().trim().max(300).optional().or(z.literal("")),
});

export const uploadSchema = z.object({
  familyId: z.string().trim().min(2),
  dataUrl: z.string().min(30),
});

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function parseDataUrl(dataUrl: string) {
  const match =
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\r\n]+)$/.exec(
      dataUrl.trim(),
    );
  if (!match) return null;
  const contentType = match[1].toLowerCase();
  if (!IMAGE_TYPES.has(contentType)) return null;
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > 2_000_000) return null;
  return { contentType, base64: buffer.toString("base64") };
}
