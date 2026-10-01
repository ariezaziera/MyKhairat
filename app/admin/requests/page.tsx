import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui";
import { listMemberRequests } from "@/lib/queries";
import { RequestActions } from "./request-actions";

export default async function RequestsPage() {
  const requests = await listMemberRequests();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Member requests</h1>
        <p className="text-sm text-slate-500">Wakil can ask to add a dependent. Approving creates an Aktif member and recalculates dues.</p>
      </div>
      {requests.length === 0 ? <Card>No requests yet.</Card> : null}
      <ul className="grid gap-3 lg:grid-cols-2">
        {requests.map((request) => (
          <li key={request.requestId}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{request.memberName}</p>
                  <p className="text-sm text-slate-500">
                    {request.familyId} · {request.wakilName} · {request.relationship}
                  </p>
                  {request.note ? <p className="mt-1 text-sm text-slate-600">{request.note}</p> : null}
                </div>
                <StatusPill status={request.status} />
              </div>
              {request.status === "Pending" ? (
                <div className="mt-3">
                  <RequestActions requestId={request.requestId} />
                </div>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
