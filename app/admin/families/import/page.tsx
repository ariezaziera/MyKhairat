import { requireAdminPage } from "@/lib/page-auth";
import { ImportForm } from "./form";
export default async function ImportPage() {
  await requireAdminPage();
  return <ImportForm />;
}
