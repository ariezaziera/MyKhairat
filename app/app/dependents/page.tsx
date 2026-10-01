import { requireWakilPage } from "@/lib/page-auth";
import { getFamilyBundle } from "@/lib/queries";
import { DependentsClient } from "./request-form";

export default async function DependentsPage() {
  const session = await requireWakilPage();
  const bundle = await getFamilyBundle(session.familyId!);
  return (
    <DependentsClient
      familyId={bundle.family.familyId}
      members={bundle.members}
      requests={bundle.requests.map((request) => ({
        requestId: request.requestId,
        memberName: request.memberName,
        relationship: request.relationship,
        status: request.status,
      }))}
    />
  );
}
