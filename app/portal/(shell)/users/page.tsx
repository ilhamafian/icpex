import { UsersManager } from "@/components/UsersManager";
import { UserModel } from "@/models/User";
import { serializeUser } from "@/utils/serializeUser";
import { requirePortalSection } from "@/utils/requirePortalAccess";

async function loadUsers() {
  try {
    const users = await new UserModel().find({}, { sort: { created_at: -1 } });
    return users.map(serializeUser);
  } catch {
    return [];
  }
}

export default async function UsersPage() {
  await requirePortalSection("users");
  const users = await loadUsers();

  return <UsersManager initialUsers={users} />;
}
