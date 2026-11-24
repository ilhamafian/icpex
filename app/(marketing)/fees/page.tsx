import type { Metadata } from "next";

import { cardGlassClass, cardGlassStyle, ContentPage } from "@/components/marketing/blocks";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { FREE_PROJECT_EVERY } from "@/schemas/registrationSchema";
import { REGISTRATION_FEES } from "@/utils/registrationFee";

export const metadata: Metadata = {
  title: "Registration Fees",
  description: "I-CRIVE 2027 participation fees for UniKL, Malaysian and international entries.",
};

function price(amount: number, currency: "MYR" | "USD") {
  return currency === "MYR" ? `RM ${amount}` : `USD ${amount}`;
}

const ROWS = [
  { label: "UniKL MIIT", fee: REGISTRATION_FEES.unikl },
  { label: "Other UniKL campuses", fee: REGISTRATION_FEES.unikl },
  { label: "Malaysian IPTA / IPTS", fee: REGISTRATION_FEES.malaysia },
  { label: "International participants", fee: REGISTRATION_FEES.international },
] as const;

export default function FeesPage() {
  return (
    <ContentPage eyebrow="Fees / Participation" title="Registration Fees">
      <ul className="flex flex-col gap-4">
        {ROWS.map((row) => (
          <LiquidGlass
            key={row.label}
            as="li"
            tint={0}
            radius={20}
            className={cardGlassClass}
            style={cardGlassStyle}
            contentClassName="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
          >
            <span className="font-medium">{row.label}</span>
            <span className="shrink-0 text-lg font-bold text-[#e8b84a]">
              {price(row.fee.amount, row.fee.currency)}
            </span>
          </LiquidGlass>
        ))}
      </ul>
      <LiquidGlass
        tint={0}
        radius={20}
        className={`mt-5 ${cardGlassClass}`}
        style={cardGlassStyle}
        contentClassName="px-5 py-5 sm:px-6"
      >
        <p className="text-xs font-bold tracking-[0.16em] text-[#e8b84a] uppercase">
          Group registration offer
        </p>
        <p className="mt-2 text-lg font-bold tracking-wide uppercase sm:text-xl">
          {`Register ${FREE_PROJECT_EVERY - 1} entries, get the ${FREE_PROJECT_EVERY}th entry complimentary`}
        </p>
      </LiquidGlass>
    </ContentPage>
  );
}
