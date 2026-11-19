import { BannerManager } from "@/components/BannerManager";
import { CampusInvitationShortcut } from "@/components/CampusInvitationShortcut";
import { ClosingCeremonyShortcut } from "@/components/ClosingCeremonyShortcut";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { BannerModel } from "@/models/Banner";
import { CompetitionModel } from "@/models/Competition";
import { educationLevelForRole } from "@/schemas/userRole";
import { getCurrentCompetitionId } from "@/utils/currentCompetition";
import { emptyDashboardData, loadDashboardData } from "@/utils/dashboardData";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { serializeBanner } from "@/utils/serializeBanner";
import { serializeCompetition } from "@/utils/serializeCatalog";

async function loadBannerData() {
  try {
    const [competitions, banners, currentCompetitionId] = await Promise.all([
      new CompetitionModel().find({}, { sort: { start_date: -1 } }),
      new BannerModel().find({}),
      getCurrentCompetitionId(),
    ]);
    return {
      competitions: competitions.map(serializeCompetition),
      banners: banners.map(serializeBanner),
      currentCompetitionId,
    };
  } catch {
    return { competitions: [], banners: [], currentCompetitionId: null };
  }
}

export default async function AdminDashboardPage() {
  const session = await requirePortalSection("dashboard");
  const track = educationLevelForRole(session.role);
  const [{ stats, chart, rows }, bannerData] = await Promise.all([
    loadDashboardData(track).catch(emptyDashboardData),
    loadBannerData(),
  ]);

  return (
    <>
      <SectionCards stats={stats} />
      {session.role === "SUPER_ADMIN" ? (
        <>
          <BannerManager
            competitions={bannerData.competitions}
            initialBanners={bannerData.banners}
            currentCompetitionId={bannerData.currentCompetitionId}
          />
          <CampusInvitationShortcut
            competitions={bannerData.competitions}
            currentCompetitionId={bannerData.currentCompetitionId}
          />
          <ClosingCeremonyShortcut
            competitions={bannerData.competitions}
            currentCompetitionId={bannerData.currentCompetitionId}
          />
        </>
      ) : null}
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive data={chart} />
      </div>
      <DataTable data={rows} />
    </>
  );
}
