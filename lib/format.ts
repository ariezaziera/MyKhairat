const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatRM(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMonth(month: string) {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return month;
  return `${MONTHS_LONG[mon - 1]} ${year}`;
}

export function formatMonthShort(month: string) {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return month;
  return `${MONTHS[mon - 1]} ${String(year).slice(2)}`;
}

export function formatDate(value: string) {
  const iso = value.length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export function todayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function currentYear() {
  return new Date().getFullYear();
}

export function familyStatusLabel(status: string) {
  if (status === "Suspended") return "Suspended";
  if (status === "Inactive") return "Inactive";
  return "Active";
}
