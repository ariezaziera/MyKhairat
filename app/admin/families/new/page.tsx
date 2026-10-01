import { FamilyForm } from "../family-form";

export default function NewFamilyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Add family</h1>
      <p className="text-sm text-slate-500">Creates the family record and a Wakil login. Dependents do not get accounts.</p>
      <FamilyForm />
    </div>
  );
}
