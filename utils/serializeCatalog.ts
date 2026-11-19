import "server-only";

import { WithId } from "mongodb";

import type { Category } from "@/schemas/categorySchema";
import type { Competition } from "@/schemas/competitionSchema";
import type { DocumentRequirement } from "@/schemas/documentRequirement";
import {
  DEFAULT_COMPETITION_ELIGIBILITY,
  type EducationLevel,
} from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

export type SerializedCompetition = {
  _id: string;
  competition_id: string;
  name: string;
  formal_name?: string;
  theme?: string;
  undergraduate_stream_name?: string;
  postgraduate_stream_name?: string;
  start_date: string;
  end_date: string;
  payment_deadline?: string;
  judging_start_date?: string;
  judging_due_date?: string;
  closing_ceremony_date?: string;
  closing_ceremony_mode?: Competition["closing_ceremony_mode"];
  closing_ceremony_time?: string;
  closing_ceremony_platform?: string;
  closing_ceremony_meeting_url?: string;
  closing_ceremony_venue?: string;
  closing_ceremony_reply_by?: string;
  closing_ceremony_join_minutes?: number;
  closing_ceremony_attendance_url?: string;
  status: Competition["status"];
  eligibility: Competition["eligibility"];
  document_requirements?: DocumentRequirement[];
  created_at?: string;
  updated_at?: string;
};

export type SerializedCategory = {
  _id: string;
  category_id: string;
  name: string;
  education_level?: EducationLevel;
};

export function serializeCompetition(
  competition: WithId<Competition>
): SerializedCompetition {
  return {
    _id: toIdString(competition._id),
    competition_id: competition.competition_id,
    name: competition.name,
    formal_name: competition.formal_name,
    theme: competition.theme,
    undergraduate_stream_name: competition.undergraduate_stream_name,
    postgraduate_stream_name: competition.postgraduate_stream_name,
    start_date: toIso(competition.start_date)!,
    end_date: toIso(competition.end_date)!,
    payment_deadline: toIso(competition.payment_deadline),
    judging_start_date: toIso(competition.judging_start_date),
    judging_due_date: toIso(competition.judging_due_date),
    closing_ceremony_date: toIso(competition.closing_ceremony_date),
    closing_ceremony_mode: competition.closing_ceremony_mode,
    closing_ceremony_time: competition.closing_ceremony_time ?? undefined,
    closing_ceremony_platform: competition.closing_ceremony_platform,
    closing_ceremony_meeting_url: competition.closing_ceremony_meeting_url,
    closing_ceremony_venue: competition.closing_ceremony_venue,
    closing_ceremony_reply_by: toIso(competition.closing_ceremony_reply_by),
    closing_ceremony_join_minutes: competition.closing_ceremony_join_minutes,
    closing_ceremony_attendance_url: competition.closing_ceremony_attendance_url,
    status: competition.status,
    eligibility: competition.eligibility ?? DEFAULT_COMPETITION_ELIGIBILITY,
    document_requirements: competition.document_requirements,
    created_at: toIso(competition.created_at),
    updated_at: toIso(competition.updated_at),
  };
}

export function serializeCategory(
  category: WithId<Category>
): SerializedCategory {
  return {
    _id: toIdString(category._id),
    category_id: category.category_id,
    name: category.name,
    education_level: category.education_level,
  };
}
