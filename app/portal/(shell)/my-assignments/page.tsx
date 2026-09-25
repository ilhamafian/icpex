import { requirePortalSection } from "@/utils/requirePortalAccess";

export default async function MyAssignmentsPage() {
  await requirePortalSection("my-assignments");

  return (
    <div className="px-4 lg:px-6">
      <h2 className="text-lg font-semibold tracking-tight">My Assignments</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your assigned submissions and scoring tools will appear here.
      </p>
    </div>
  );
}
