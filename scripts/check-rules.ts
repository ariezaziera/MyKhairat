import { assessFamily, expectedAmount, memberEligibility } from "../lib/business";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const now = new Date(2026, 9, 1);
const dues = expectedAmount(4, 5);
assert(dues === 20, "Monthly dues must be active members times the base rate.");

const paid = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].map(
  (month) => ({ paymentMonthYear: month, amountPaid: 20, approvalStatus: "Approved" }),
);
const clear = assessFamily({
  joinedMonth: "2026-01",
  openingBalance: 0,
  familyStatus: "Active",
  activeCount: 4,
  rate: 5,
  dueDay: 7,
  payments: paid,
  now,
});
assert(clear.suggestedStatus === "Active", "A family paid through the last closed month stays Active.");
assert(clear.consecutiveUnpaid === 0, "Paid months do not count as unpaid.");
assert(clear.arrearsAmount === 0, "A fully paid family has no arrears before the due day.");

const behind = assessFamily({
  joinedMonth: "2026-01",
  openingBalance: 0,
  familyStatus: "Active",
  activeCount: 4,
  rate: 5,
  dueDay: 7,
  payments: paid.filter((payment) => !["2026-07", "2026-08", "2026-09"].includes(payment.paymentMonthYear)),
  now,
});
assert(behind.consecutiveUnpaid === 3, "Three closed months without full payment are consecutive.");
assert(behind.suggestedStatus === "Suspended", "Three consecutive unpaid months suspend the family.");
assert(behind.arrearsAmount === 60, "Arrears equal the three unpaid months.");

const twoMonths = assessFamily({
  joinedMonth: "2026-01",
  openingBalance: 10,
  familyStatus: "Active",
  activeCount: 4,
  rate: 5,
  dueDay: 7,
  payments: paid.filter((payment) => !["2026-08", "2026-09"].includes(payment.paymentMonthYear)),
  now,
});
assert(twoMonths.suggestedStatus === "Active", "Two unpaid months do not suspend the family.");
assert(twoMonths.bakiAwal === 10, "Baki awal is the opening balance.");
assert(twoMonths.arrearsAmount === 50, "Arrears include the opening balance plus unpaid closed months.");

const pendingOnly = assessFamily({
  joinedMonth: "2026-09",
  openingBalance: 0,
  familyStatus: "Active",
  activeCount: 1,
  rate: 5,
  dueDay: 7,
  payments: [{ paymentMonthYear: "2026-09", amountPaid: 5, approvalStatus: "Pending" }],
  now,
});
assert(pendingOnly.suggestedStatus === "Suspended" || pendingOnly.consecutiveUnpaid >= 1, "Pending is not a completed payment.");
assert(pendingOnly.approvedTotal === 0, "Only approved payments reduce the balance.");

const inactive = memberEligibility("Aktif", "Suspended");
assert(!inactive.eligible, "Suspended families are not eligible for Khairat Kematian.");
const dependent = memberEligibility("Tidak Aktif", "Active");
assert(!dependent.eligible, "Only Aktif members are eligible.");
const eligible = memberEligibility("Aktif", "Active");
assert(eligible.eligible, "Aktif members in an Active family are eligible.");

const afterNewMember = assessFamily({
  joinedMonth: "2026-01",
  openingBalance: 0,
  familyStatus: "Active",
  activeCount: 5,
  rate: 5,
  dueDay: 7,
  payments: paid.map((payment) => ({ ...payment, expectedAmount: 20 })),
  now,
});
assert(afterNewMember.suggestedStatus === "Active", "A new member must not reopen months already paid at the old rate.");
assert(afterNewMember.consecutiveUnpaid === 0, "Previously settled months stay settled.");

const locked = assessFamily({
  joinedMonth: "2026-01",
  openingBalance: 0,
  familyStatus: "Inactive",
  activeCount: 4,
  rate: 5,
  dueDay: 7,
  payments: [],
  now,
});
assert(locked.suggestedStatus === "Inactive", "Inactive families are not auto-reactivated.");

console.log("Business rules passed.");
