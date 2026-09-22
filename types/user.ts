import type { User } from "@/schemas/userSchema";

export type SerializedUser = {
  _id: string;
  email: string;
  name?: string;
  roles: User["roles"];
  status: User["status"];
  email_verified: boolean;
  invite_expires_at?: string;
  created_at?: string;
  updated_at?: string;
};
