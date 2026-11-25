import { CoOrganiserManager } from "@/components/CoOrganiserManager";
import { CampusInvitationShortcut } from "@/components/CampusInvitationShortcut";
import { ClosingCeremonyShortcut } from "@/components/ClosingCeremonyShortcut";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { CoOrganiserModel } from "@/models/CoOrganiser";
import { CompetitionModel } from "@/models/Competition";
import { educationLevelForRole } from "@/schemas/userRole";
import { getCurrentCompetitionId } from "@/utils/currentCompetition";
import { emptyDashboardData, loadDashboardData } from "@/utils/dashboardData";
import { requirePortalSection } from "@/utils/requirePortalAccess";
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

async function loadCompetitionOptions() {
  try {
    const [competitions, currentCompetitionId] = await Promise.all([
      new CompetitionModel().find({}, { sort: { start_date: -1 } }),
      getCurrentCompetitionId(),
    ]);
    return {
      competitions: competitions.map(serializeCompetition),
      currentCompetitionId,
    };
  } catch {
    return { competitions: [], currentCompetitionId: null };
  }
}

export default async function AdminDashboardPage() {
  const session = await requirePortalSection("dashboard");
  const track = educationLevelForRole(session.role);
  const [{ stats, chart, rows }, competitions, coOrganisers] = await Promise.all([
    loadDashboardData(track).catch(emptyDashboardData),
    loadCompetitionOptions(),
    loadCoOrganisers(),
  ]);

  return (
    <>
      <SectionCards stats={stats} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive data={chart} />
      </div>
      {session.role === "SUPER_ADMIN" ? (
        <>
          <CoOrganiserManager initialLogos={coOrganisers} />
          <div className="grid items-stretch gap-4 px-4 md:grid-cols-2 lg:px-6">
            <div className="h-full">
              <CampusInvitationShortcut
                competitions={competitions.competitions}
                currentCompetitionId={competitions.currentCompetitionId}
              />
            </div>
            <div className="h-full">
              <ClosingCeremonyShortcut
                competitions={competitions.competitions}
                currentCompetitionId={competitions.currentCompetitionId}
              />
            </div>
          </div>
        </>
      ) : null}
      <DataTable data={rows} />
    </>
  );
}
