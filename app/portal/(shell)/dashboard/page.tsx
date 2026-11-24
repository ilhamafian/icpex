import { BannerManager } from "@/components/BannerManager";
import { CoOrganiserManager } from "@/components/CoOrganiserManager";
import { CampusInvitationShortcut } from "@/components/CampusInvitationShortcut";
import { ClosingCeremonyShortcut } from "@/components/ClosingCeremonyShortcut";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { BannerModel } from "@/models/Banner";
import { CoOrganiserModel } from "@/models/CoOrganiser";
import { CompetitionModel } from "@/models/Competition";
import { educationLevelForRole } from "@/schemas/userRole";
import { getCurrentCompetitionId } from "@/utils/currentCompetition";
import { emptyDashboardData, loadDashboardData } from "@/utils/dashboardData";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { serializeBanner } from "@/utils/serializeBanner";
import { serializeCoOrganiser } from "@/utils/serializeCoOrganiser";
import { serializeCompetition } from "@/utils/serializeCatalog";

async function loadCoOrganisers() {
  try {
    const logos = await new CoOrganiserModel().list();
    return logos.map(serializeCoOrganiser);
  } catch {
    return [];
  }
}

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
  const [{ stats, chart, rows }, bannerData, coOrganisers] = await Promise.all([
    loadDashboardData(track).catch(emptyDashboardData),
    loadBannerData(),
    loadCoOrganisers(),
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
          <CoOrganiserManager initialLogos={coOrganisers} />
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
