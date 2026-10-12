import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  programStartMonth: text("program_start_month"),
  bankVerified: integer("bank_verified").notNull().default(0),
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
  supportPhone: text("support_phone").notNull().default(""),
  agreementMonth: text("agreement_month"),
});

export const families = sqliteTable("families", {
  familyName: text("family_name"),
  registrationComplete: integer("registration_complete").notNull().default(1),
  externalId: text("external_id"),
  billingStartMonth: text("billing_start_month"),
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
  accessProfile: text("access_profile").notNull().default("owner"),
  activationHash: text("activation_hash"),
  activationExpires: text("activation_expires"),
  activationRequired: integer("activation_required").notNull().default(0),
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  familyId: text("family_id"),
  phone: text("phone"),
  active: integer("active").notNull().default(1),
  username: text("username").unique(),
  mustChangePassword: integer("must_change_password").notNull().default(0),
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const members = sqliteTable("members", {
  externalId: text("external_id"),
  billingStartMonth: text("billing_start_month"),
  billingEndMonth: text("billing_end_month"),
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
  isOpeningAllocation: integer("is_opening_allocation").notNull().default(0),
  sourceReference: text("source_reference"),
  sourceBatchId: text("source_batch_id"),
  sourceRow: integer("source_row"),
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
  status: text("status").notNull().default("Submitted"),
  recipientName: text("recipient_name"),
  recipientAccount: text("recipient_account"),
  evidenceUrl: text("evidence_url"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  paidDate: text("paid_date"),
  payoutReference: text("payout_reference"),
  eventKey: text("event_key"),
  policyAmount: real("policy_amount"),
  exceptionReason: text("exception_reason"),
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
