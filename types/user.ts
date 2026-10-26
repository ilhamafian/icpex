import type { CompetitionEligibility } from "@/schemas/educationLevel";
import type { User } from "@/schemas/userSchema";

/** Judge profile sent to the portal. National ID stays on the user document. */
export type SerializedJudgeProfile = {
  institution: {
    name: string;
    country: string;
  };
  institution_key: string;
  category_ids: string[];
  education_eligibility: CompetitionEligibility;
};

export type SerializedUser = {
  _id: string;
  email: string;
  name?: string;
  roles: User["roles"];
  status: User["status"];
  email_verified: boolean;
  invite_expires_at?: string;
  judge_profile?: SerializedJudgeProfile;
  created_at?: string;
  updated_at?: string;
};
