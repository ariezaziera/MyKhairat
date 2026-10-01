import { z } from "zod";

const month = z.string().regex(/^\d{4}-\d{2}$/, "Use a valid month");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const settingsSchema = z.object({
  baseRatePerMember: z.coerce.number().positive("Base rate must be greater than 0"),
  paymentDueDay: z.coerce.number().int().min(1).max(28),
  paymentMethod: z.string().trim().min(2).max(80),
  bankName: z.string().trim().min(2).max(80),
  bankAccountNumber: z.string().trim().min(5).max(40),
  bankAccountName: z.string().trim().min(2).max(120),
  deathPayoutAmount: z.coerce.number().positive("Death lump sum must be greater than 0"),
  wardedPayoutAmount: z.coerce.number().positive("Warded lump sum must be greater than 0"),
});

export const familyCreateSchema = z.object({
  wakilName: z.string().trim().min(2).max(120),
  wakilPhone: z.string().trim().min(8).max(20),
  email: z.string().trim().email(),
  password: z.string().min(6).max(80),
  familyStatus: z.enum(["Active", "Suspended", "Inactive"]),
  joinedMonth: month,
  openingBalance: z.coerce.number(),
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
  amountPaid: z.coerce.number().positive("Amount must be greater than 0"),
  transactionReference: z.string().trim().min(4).max(64),
  receiptId: z.string().trim().min(4),
});

export const rejectSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export const claimSchema = z.object({
  familyId: z.string().trim().min(2),
  memberId: z.string().trim().min(2),
  claimDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  claimType: z.enum(["Death", "Warded"]),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const duitnowSchema = z.object({
  duitnowId: z.string().trim().max(40).optional().or(z.literal("")),
  dataUrl: z.string().optional().or(z.literal("")),
  removeImage: z.boolean().optional(),
});

export const adminAccountSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(6).max(80),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export const accountUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  password: z.union([z.string().min(6).max(80), z.literal("")]).optional(),
  phone: z.string().trim().max(20).optional(),
  active: z.boolean().optional(),
});

export const manualPaymentSchema = z.object({
  familyId: z.string().trim().min(2),
  paymentMonthYear: month,
  amountPaid: z.coerce.number().positive("Amount must be greater than 0"),
  transactionReference: z.string().trim().min(2).max(64),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  markApproved: z.boolean(),
  entryNote: z.string().trim().max(300).optional().or(z.literal("")),
});

export const uploadSchema = z.object({
  familyId: z.string().trim().min(2),
  dataUrl: z.string().min(30),
});

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\r\n]+)$/.exec(dataUrl.trim());
  if (!match) return null;
  const contentType = match[1].toLowerCase();
  if (!IMAGE_TYPES.has(contentType)) return null;
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > 2_000_000) return null;
  return { contentType, base64: buffer.toString("base64") };
}
