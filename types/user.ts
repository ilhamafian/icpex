import type { CompetitionEligibility } from "@/schemas/educationLevel";
import type { JudgeApplicationKind, User } from "@/schemas/userSchema";

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

/** Public application details. The CV file is downloaded through an admin route. */
export type SerializedJudgeApplication = {
  kind: JudgeApplicationKind;
  title: string;
  address: string;
  postcode: string;
  phone: string;
  field_of_expertise: string;
  jury_experience?: string;
  cv_file_name: string;
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
  judge_application?: SerializedJudgeApplication;
  created_at?: string;
  updated_at?: string;
};
