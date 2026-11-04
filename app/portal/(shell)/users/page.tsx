import { UsersManager } from "@/components/UsersManager";
import { CompetitionModel } from "@/models/Competition";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { rolesGrantableBy } from "@/schemas/userRole";
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
  const session = await requirePortalSection("users");
  const { users, competitions, currentCompetitionId } = await loadUsers();
  const assignableRoles = rolesGrantableBy(session.role);

  let visibleCompetitions = competitions;
  if (session.role !== "SUPER_ADMIN") {
    const actor = await new UserModel().findByEmail(session.username.toLowerCase());
    const allowed = new Set(
      (actor?.roles ?? [])
        .filter((grant) => grant.role === session.role && grant.competition_id)
        .map((grant) => grant.competition_id as string)
    );
    visibleCompetitions = competitions.filter((item) => allowed.has(item.id));
  }

  return (
    <UsersManager
      initialUsers={users}
      competitions={visibleCompetitions}
      currentCompetitionId={currentCompetitionId}
      assignableRoles={assignableRoles}
    />
  );
}
