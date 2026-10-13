import { MALAYSIA, MALAYSIA_UNIVERSITIES } from "@/utils/institutions";

export const CURRENCIES = ["MYR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type ProjectFee = { amount: number; currency: Currency };

/** Per-project fees, before the every-Nth-project-free rule. */
export const REGISTRATION_FEES = {
  unikl: { amount: 100, currency: "MYR" },
  malaysia: { amount: 150, currency: "MYR" },
  international: { amount: 50, currency: "USD" },
} as const satisfies Record<string, ProjectFee>;

export function isUniklInstitution(name: string) {
  return MALAYSIA_UNIVERSITIES.UniKL.includes(name.trim());
}

/** UniKL campuses pay the UniKL rate; other Malaysian universities the local rate. */
export function feeForInstitution(institution: {
  name: string;
  country: string;
}): ProjectFee {
  if (institution.country.trim() !== MALAYSIA) {
    return REGISTRATION_FEES.international;
  }
  return isUniklInstitution(institution.name)
    ? REGISTRATION_FEES.unikl
    : REGISTRATION_FEES.malaysia;
}

export function formatMoney(amount: number, currency: Currency = "MYR") {
  return `${currency === "MYR" ? "RM" : "USD "}${amount.toFixed(2)}`;
}
