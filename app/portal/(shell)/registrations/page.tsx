import { requirePortalSection } from "@/utils/requirePortalAccess";

export default async function RegistrationsPage() {
  await requirePortalSection("registrations");

  return (
    <div className="px-4 lg:px-6">
      <h2 className="text-lg font-semibold tracking-tight">Registrations</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Secretary tools for reviewing and managing competition registrations will
        appear here.
      </p>
    </div>
  );
}
