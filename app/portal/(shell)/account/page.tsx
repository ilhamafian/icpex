import { redirect } from "next/navigation";

import { AccountSettings } from "@/components/AccountSettings";
import { getSession } from "@/lib/session";
import { UserModel } from "@/models/User";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/portal/login");

  const account =
    session.source === "env"
      ? null
      : await new UserModel().findByEmail(session.username.toLowerCase());

  return (
    <div className="px-4 lg:px-6">
      <AccountSettings
        username={account?.name?.trim() ?? ""}
        email={account?.email ?? ""}
        canEdit={session.source !== "env" && Boolean(account)}
      />
    </div>
  );
}
