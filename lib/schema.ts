import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  baseRatePerMember: real("base_rate_per_member").notNull(),
  paymentDueDay: integer("payment_due_day").notNull(),
  paymentMethod: text("payment_method").notNull(),
  bankName: text("bank_name").notNull(),
  bankAccountNumber: text("bank_account_number").notNull(),
  bankAccountName: text("bank_account_name").notNull(),
  duitnowId: text("duitnow_id"),
  duitnowContentType: text("duitnow_content_type"),
  duitnowQr: text("duitnow_qr"),
  deathPayoutAmount: real("death_payout_amount").notNull().default(2000),
  wardedPayoutAmount: real("warded_payout_amount").notNull().default(200),
  updatedAt: text("updated_at").notNull(),
});

export const families = sqliteTable("families", {
  familyId: text("family_id").primaryKey(),
  wakilName: text("wakil_name").notNull(),
  wakilPhone: text("wakil_phone").notNull(),
  familyStatus: text("family_status").notNull(),
  joinedMonth: text("joined_month").notNull(),
  openingBalance: real("opening_balance").notNull().default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  familyId: text("family_id"),
  phone: text("phone"),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const members = sqliteTable("members", {
  memberId: text("member_id").primaryKey(),
  familyId: text("family_id").notNull(),
  memberName: text("member_name").notNull(),
  memberStatus: text("member_status").notNull(),
  relationship: text("relationship").notNull(),
  icNumber: text("ic_number"),
  createdAt: text("created_at").notNull(),
});

export const receipts = sqliteTable("receipts", {
  receiptId: text("receipt_id").primaryKey(),
  familyId: text("family_id").notNull(),
  contentType: text("content_type").notNull(),
  imageData: text("image_data").notNull(),
  createdAt: text("created_at").notNull(),
});

export const payments = sqliteTable("payments", {
  paymentId: text("payment_id").primaryKey(),
  familyId: text("family_id").notNull(),
  paymentDate: text("payment_date").notNull(),
  paymentMonthYear: text("payment_month_year").notNull(),
  amountPaid: real("amount_paid").notNull(),
  expectedAmount: real("expected_amount").notNull(),
  transactionReference: text("transaction_reference").notNull(),
  receiptImageUrl: text("receipt_image_url"),
  approvalStatus: text("approval_status").notNull(),
  rejectionReason: text("rejection_reason"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  submittedBy: text("submitted_by"),
  entryNote: text("entry_note"),
  createdAt: text("created_at").notNull(),
});

export const memberRequests = sqliteTable("member_requests", {
  requestId: text("request_id").primaryKey(),
  familyId: text("family_id").notNull(),
  memberName: text("member_name").notNull(),
  relationship: text("relationship").notNull(),
  icNumber: text("ic_number"),
  status: text("status").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
});

export const activityLog = sqliteTable("activity_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  detail: text("detail").notNull(),
  createdAt: text("created_at").notNull(),
});

export const claims = sqliteTable("claims", {
  claimId: text("claim_id").primaryKey(),
  familyId: text("family_id").notNull(),
  memberId: text("member_id").notNull(),
  claimDate: text("claim_date").notNull(),
  claimType: text("claim_type").notNull().default("Death"),
  amount: real("amount").notNull(),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});
