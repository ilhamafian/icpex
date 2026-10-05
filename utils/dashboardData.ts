import "server-only";

import { CategoryModel } from "@/models/Category";
import { CompetitionModel } from "@/models/Competition";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { UserModel } from "@/models/User";
import type { JudgeAssignment } from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";
import type { Payment } from "@/schemas/paymentSchema";
import type { Registration } from "@/schemas/registrationSchema";

const CHART_DAYS = 90;

export type DashboardStats = {
  totalRegistrations: number;
  registrationsThisMonth: number;
  registrationsLastMonth: number;
  revenue: number;
  paidCount: number;
  pendingPayments: number;
  failedPayments: number;
  withoutPayment: number;
  totalAssignments: number;
  submittedAssignments: number;
  unassignedRegistrations: number;
};

export type DashboardChartPoint = {
  date: string;
  registrations: number;
  payments: number;
};

export type DashboardJudge = {
  name: string;
  type: JudgeAssignment["type"];
  status: JudgeAssignment["status"];
  total_score: number;
  submitted_at?: string;
};

export type DashboardRow = {
  id: string;
  registration_number: string;
  project_title: string;
  project_abstract: string;
  participant_name: string;
  participant_email: string;
  participant_phone: string;
  education_level: Registration["participant"]["education_level"];
  institution: string;
  country: string;
  competition: string;
  category: string;
  status: Registration["status"];
  created_at?: string;
  payment: {
    status: Payment["status"];
    amount: number;
    receipt_url: string;
  } | null;
  judges: DashboardJudge[];
  average_score: number | null;
};

export type DashboardData = {
  stats: DashboardStats;
  chart: DashboardChartPoint[];
  rows: DashboardRow[];
};

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildChart(
  registrations: Registration[],
  payments: Payment[],
  today: Date
): DashboardChartPoint[] {
  const points = new Map<string, DashboardChartPoint>();
  for (let offset = CHART_DAYS - 1; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const key = dayKey(date);
    points.set(key, { date: key, registrations: 0, payments: 0 });
  }

  for (const registration of registrations) {
    if (!registration.created_at) continue;
    const point = points.get(dayKey(new Date(registration.created_at)));
    if (point) point.registrations += 1;
  }
  for (const payment of payments) {
    if (!payment.created_at) continue;
    const point = points.get(dayKey(new Date(payment.created_at)));
    if (point) point.payments += 1;
  }

  return [...points.values()];
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [registrations, payments, assignments, judges, competitions, categories] =
    await Promise.all([
      new RegistrationModel().find({}, { sort: { created_at: -1 } }),
      new PaymentModel().find({}, { sort: { created_at: -1 } }),
      new JudgeAssignmentModel().find({}),
      new UserModel().find({
        "roles.role": { $in: ["THESIS_JUDGE", "EBOOK_JUDGE"] },
      }),
      new CompetitionModel().find({}),
      new CategoryModel().find({}),
    ]);

  const judgeNames = new Map(
    judges.map((judge) => [toIdString(judge._id), judge.name || judge.email])
  );
  const competitionNames = new Map(
    competitions.map((item) => [toIdString(item._id), item.name])
  );
  const categoryNames = new Map(
    categories.map((item) => [toIdString(item._id), item.name])
  );

  // Payments are sorted newest first, so the first one seen per registration wins.
  const paymentByRegistration = new Map<string, Payment>();
  for (const payment of payments) {
    const key = toIdString(payment.registration_id);
    if (!paymentByRegistration.has(key)) paymentByRegistration.set(key, payment);
  }

  const assignmentsByRegistration = new Map<string, JudgeAssignment[]>();
  for (const assignment of assignments) {
    const list =
      assignmentsByRegistration.get(assignment.registration_number) ?? [];
    list.push(assignment);
    assignmentsByRegistration.set(assignment.registration_number, list);
  }

  const rows: DashboardRow[] = registrations.map((registration) => {
    const id = toIdString(registration._id);
    const payment = paymentByRegistration.get(id);
    const registrationAssignments =
      assignmentsByRegistration.get(registration.registration_number) ?? [];
    const scored = registrationAssignments.filter((item) => item.submitted_at);

    return {
      id,
      registration_number: registration.registration_number,
      project_title: registration.project.title,
      project_abstract: registration.project.abstract,
      participant_name: registration.participant.name,
      participant_email: registration.participant.email,
      participant_phone: registration.participant.phone,
      education_level: registration.participant.education_level,
      institution: registration.participant.institution.name,
      country: registration.participant.institution.country,
      competition:
        competitionNames.get(toIdString(registration.competition_id)) ?? "—",
      category: categoryNames.get(toIdString(registration.category_id)) ?? "—",
      status: registration.status,
      created_at: toIso(registration.created_at),
      payment: payment
        ? {
            status: payment.status,
            amount: payment.amount,
            receipt_url: payment.receipt_url,
          }
        : null,
      judges: registrationAssignments.map((item) => ({
        name: judgeNames.get(toIdString(item.judge_id)) ?? "Unknown judge",
        type: item.type,
        status: item.status,
        total_score: item.total_score ?? 0,
        submitted_at: toIso(item.submitted_at),
      })),
      average_score: scored.length
        ? scored.reduce((sum, item) => sum + (item.total_score ?? 0), 0) /
          scored.length
        : null,
    };
  });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let registrationsThisMonth = 0;
  let registrationsLastMonth = 0;
  for (const registration of registrations) {
    if (!registration.created_at) continue;
    const created = new Date(registration.created_at);
    if (created >= thisMonthStart) registrationsThisMonth += 1;
    else if (created >= lastMonthStart) registrationsLastMonth += 1;
  }

  const latestPayments = [...paymentByRegistration.values()];
  const paid = latestPayments.filter((payment) => payment.status === "PAID");

  const stats: DashboardStats = {
    totalRegistrations: registrations.length,
    registrationsThisMonth,
    registrationsLastMonth,
    revenue: paid.reduce((sum, payment) => sum + payment.amount, 0),
    paidCount: paid.length,
    pendingPayments: latestPayments.filter((p) => p.status === "PENDING")
      .length,
    failedPayments: latestPayments.filter((p) => p.status === "FAILED").length,
    withoutPayment: rows.filter((row) => !row.payment).length,
    totalAssignments: assignments.length,
    submittedAssignments: assignments.filter((item) => item.submitted_at)
      .length,
    unassignedRegistrations: rows.filter((row) => row.judges.length === 0)
      .length,
  };

  return {
    stats,
    chart: buildChart(registrations, payments, now),
    rows,
  };
}

export function emptyDashboardData(): DashboardData {
  return {
    stats: {
      totalRegistrations: 0,
      registrationsThisMonth: 0,
      registrationsLastMonth: 0,
      revenue: 0,
      paidCount: 0,
      pendingPayments: 0,
      failedPayments: 0,
      withoutPayment: 0,
      totalAssignments: 0,
      submittedAssignments: 0,
      unassignedRegistrations: 0,
    },
    chart: buildChart([], [], new Date()),
    rows: [],
  };
}
