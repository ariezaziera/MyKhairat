import { WakilShell } from "@/components/shells";
import { requireWakilPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function WakilLayout({ children }: { children: React.ReactNode }) {
  const session = await requireWakilPage();
  return (
    <WakilShell name={session.name} familyId={session.familyId ?? ""}>
      {children}
    </WakilShell>
  );
}
