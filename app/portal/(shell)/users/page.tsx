import { UsersManager } from "@/components/UsersManager";
import { CompetitionModel } from "@/models/Competition";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { getCurrentCompetitionId } from "@/utils/currentCompetition";
import { serializeUser } from "@/utils/serializeUser";
import { requirePortalSection } from "@/utils/requirePortalAccess";

async function loadUsers() {
  try {
    const [users, competitions, currentCompetitionId] = await Promise.all([
      new UserModel().find({}, { sort: { created_at: -1 } }),
      new CompetitionModel().find({}, { sort: { start_date: -1 } }),
      getCurrentCompetitionId(),
    ]);
    return {
      users: users.map(serializeUser),
      competitions: competitions.map((competition) => ({
        id: toIdString(competition._id),
        name: competition.name,
        status: competition.status,
      })),
      currentCompetitionId,
    };
  } catch {
    return { users: [], competitions: [], currentCompetitionId: null };
  }
}

export default async function UsersPage() {
  await requirePortalSection("users");
  const { users, competitions, currentCompetitionId } = await loadUsers();

  return (
    <UsersManager
      initialUsers={users}
      competitions={competitions}
      currentCompetitionId={currentCompetitionId}
    />
  );
}
