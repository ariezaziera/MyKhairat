import { MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Alert, Card } from "@/components/ui";
import { phoneHref, whatsappHref } from "@/lib/business";
import { formatMonth, formatRM } from "@/lib/format";
import { getArrears } from "@/lib/queries";

export default async function ArrearsPage() {
  const families = await getArrears();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Arrears Report</h1>
      <Alert tone={families.length ? "danger" : "success"}>
        {families.length} {families.length === 1 ? "family" : "families"} overdue
      </Alert>
      <ul className="grid gap-3 lg:grid-cols-2">
        {families.map((family) => {
          const message = `Assalamualaikum ${family.wakilName}, ini peringatan daripada MyKhairat. Akaun ${family.familyId} mempunyai tunggakan ${formatRM(family.arrearsAmount)}. Sila jelaskan bayaran. Terima kasih.`;
          return (
            <li key={family.familyId}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {family.familyId} · {family.wakilName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {family.overdueMonths.length ? family.overdueMonths.map((month) => formatMonth(month)).join(", ") : "Opening balance"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-rose-700">{formatRM(family.arrearsAmount)} due</p>
                    <p className="text-xs text-slate-500">
                      {family.consecutiveUnpaid} consecutive unpaid {family.consecutiveUnpaid === 1 ? "month" : "months"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={family.familyStatus} />
                    <a href={phoneHref(family.wakilPhone)} aria-label={`Call ${family.wakilName}`} className="rounded-full bg-slate-100 p-2 text-slate-700">
                      <Phone className="h-4 w-4" />
                    </a>
                    <a
                      href={whatsappHref(family.wakilPhone, message)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Message ${family.wakilName}`}
                      className="rounded-full bg-emerald-50 p-2 text-brand-green"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <Link href={`/admin/families/${family.familyId}`} className="mt-3 inline-block text-sm font-semibold text-brand-blue">
                  Open family
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
