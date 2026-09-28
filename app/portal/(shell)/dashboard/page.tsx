import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { emptyDashboardData, loadDashboardData } from "@/utils/dashboardData";
import { requirePortalSection } from "@/utils/requirePortalAccess";

export default async function AdminDashboardPage() {
  await requirePortalSection("dashboard");
  const { stats, chart, rows } = await loadDashboardData().catch(
    emptyDashboardData
  );

  return (
    <>
      <SectionCards stats={stats} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive data={chart} />
      </div>
      <DataTable data={rows} />
    </>
  );
}
