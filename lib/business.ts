export type PaymentLite = {
  paymentMonthYear: string;
  amountPaid: number;
  approvalStatus: string;
  expectedAmount?: number;
};

export type MonthState = "BeforeJoin" | "Upcoming" | "Paid" | "Partial" | "Overdue" | "Due" | "Pending";

export type MonthRow = {
  month: string;
  expected: number;
  paid: number;
  outstanding: number;
  settled: boolean;
  overdue: boolean;
  hasPending: boolean;
  state: MonthState;
};

export type Assessment = {
  activeCount: number;
  monthlyDues: number;
  months: MonthRow[];
  consecutiveUnpaid: number;
  shouldSuspend: boolean;
  suggestedStatus: "Active" | "Suspended" | "Inactive";
  arrearsAmount: number;
  overdueMonths: MonthRow[];
  bakiAwal: number;
  bakiSemasa: number;
  accrued: number;
  approvedTotal: number;
};

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(month: string, delta: number) {
  const [year, mon] = month.split("-").map(Number);
  return monthKey(new Date(year, mon - 1 + delta, 1));
}

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function expectedAmount(activeCount: number, rate: number) {
  return round2(Math.max(0, activeCount) * rate);
}

export function isMonthClosed(month: string, now: Date, dueDay: number) {
  const current = monthKey(now);
  if (month < current) return true;
  if (month > current) return false;
  return now.getDate() > dueDay;
}

export function listMonths(from: string, to: string) {
  if (from > to) return [];
  const months: string[] = [];
  let cursor = from;
  while (cursor <= to && months.length < 360) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

export function buildMonthRows(input: {
  joinedMonth: string;
  fromMonth: string;
  toMonth: string;
  activeCount: number;
  rate: number;
  payments: PaymentLite[];
  now: Date;
  dueDay: number;
}): MonthRow[] {
  const dues = expectedAmount(input.activeCount, input.rate);
  const current = monthKey(input.now);
  return listMonths(input.fromMonth, input.toMonth).map((month) => {
    const inFund = month >= input.joinedMonth;
    const approved = input.payments.filter(
      (payment) => payment.paymentMonthYear === month && payment.approvalStatus === "Approved",
    );
    const paid = round2(approved.reduce((sum, payment) => sum + payment.amountPaid, 0));
    const billed = approved.reduce((highest, payment) => Math.max(highest, payment.expectedAmount ?? payment.amountPaid), 0);
    const expected = !inFund ? 0 : approved.length ? round2(billed) : dues;
    const outstanding = inFund ? round2(Math.max(0, expected - paid)) : 0;
    const settled = inFund && outstanding <= 0.001;
    const closed = isMonthClosed(month, input.now, input.dueDay);
    const hasPending = input.payments.some(
      (payment) => payment.paymentMonthYear === month && payment.approvalStatus === "Pending",
    );
    let state: MonthState;
    if (!inFund) state = "BeforeJoin";
    else if (month > current) state = "Upcoming";
    else if (settled) state = "Paid";
    else if (closed && paid > 0) state = "Partial";
    else if (closed) state = "Overdue";
    else if (hasPending) state = "Pending";
    else state = "Due";
    return {
      month,
      expected,
      paid,
      outstanding,
      settled,
      overdue: inFund && closed && !settled,
      hasPending,
      state,
    };
  });
}

export function assessFamily(input: {
  joinedMonth: string;
  openingBalance: number;
  familyStatus: string;
  activeCount: number;
  rate: number;
  payments: PaymentLite[];
  now?: Date;
  dueDay: number;
}): Assessment {
  const now = input.now ?? new Date();
  const current = monthKey(now);
  const monthlyDues = expectedAmount(input.activeCount, input.rate);
  const months = buildMonthRows({
    joinedMonth: input.joinedMonth,
    fromMonth: input.joinedMonth,
    toMonth: current,
    activeCount: input.activeCount,
    rate: input.rate,
    payments: input.payments,
    now,
    dueDay: input.dueDay,
  });
  const byMonth = new Map(months.map((row) => [row.month, row]));
  const closed = listMonths(input.joinedMonth, current).filter((month) => isMonthClosed(month, now, input.dueDay));
  let consecutiveUnpaid = 0;
  for (let index = closed.length - 1; index >= 0; index -= 1) {
    const row = byMonth.get(closed[index]);
    if (!row || row.settled) break;
    consecutiveUnpaid += 1;
  }
  const approvedTotal = round2(
    input.payments
      .filter((payment) => payment.approvalStatus === "Approved")
      .reduce((sum, payment) => sum + payment.amountPaid, 0),
  );
  const accrued = round2(months.reduce((sum, row) => sum + row.expected, 0));
  const bakiAwal = round2(input.openingBalance);
  const bakiSemasa = round2(bakiAwal + accrued - approvedTotal);
  const currentRow = months.find((row) => row.month === current);
  const notYetOverdue = currentRow && !currentRow.overdue ? currentRow.outstanding : 0;
  const arrearsAmount = round2(Math.max(0, bakiSemasa - notYetOverdue));
  const overdueMonths = months.filter((row) => row.overdue);
  let suggestedStatus: Assessment["suggestedStatus"];
  if (input.familyStatus === "Inactive") suggestedStatus = "Inactive";
  else if (consecutiveUnpaid >= 3) suggestedStatus = "Suspended";
  else suggestedStatus = "Active";
  return {
    activeCount: input.activeCount,
    monthlyDues,
    months,
    consecutiveUnpaid,
    shouldSuspend: suggestedStatus === "Suspended",
    suggestedStatus,
    arrearsAmount,
    overdueMonths,
    bakiAwal,
    bakiSemasa,
    accrued,
    approvedTotal,
  };
}

export function memberEligibility(memberStatus: string, familyStatus: string) {
  if (familyStatus === "Suspended") {
    return {
      eligible: false,
      reason: "Family is Suspended after 3 consecutive unpaid months, so members cannot receive a death or warded claim.",
    };
  }
  if (familyStatus !== "Active") {
    return { eligible: false, reason: "Family is inactive and cannot receive a claim." };
  }
  if (memberStatus !== "Aktif") {
    return { eligible: false, reason: "Only members listed as Aktif can receive a claim." };
  }
  return { eligible: true, reason: "Eligible for khairat kematian or a critical warded claim." };
}

export function whatsappHref(phone: string, message: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `6${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function phoneHref(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
}
