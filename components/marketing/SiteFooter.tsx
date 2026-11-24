import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

import { Rise } from "@/components/marketing/Rise";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { CoOrganiserModel } from "@/models/CoOrganiser";
import {
  serializeCoOrganiser,
  type SerializedCoOrganiser,
} from "@/utils/serializeCoOrganiser";

async function loadCoOrganisers(): Promise<SerializedCoOrganiser[]> {
  try {
    const logos = await new CoOrganiserModel().list();
    return logos.map(serializeCoOrganiser);
  } catch {
    return [];
  }
}

export async function SiteFooter() {
  await headers();
  const coOrganisers = await loadCoOrganisers();
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <Rise>
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Organised by • Publication • Co-Organisers
          </h2>
        </Rise>
        <div className="mt-12 grid items-start gap-12 lg:grid-cols-2">
          <Rise delay={0.06}>
            <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#e8b84a]">Organised by</p>
            <Image
              src="/brand/unikl-logo.png"
              alt="Universiti Kuala Lumpur"
              width={473}
              height={295}
              className="mt-6 h-24 w-auto sm:h-28"
            />
            <p className="mt-4 max-w-sm text-sm text-white/70">
              Research & Innovation Section, Universiti Kuala Lumpur Malaysian Institute of
              Information Technology.
            </p>
            </div>
          </Rise>
          <Rise delay={0.14}>
            <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#e8b84a]">
              Publication opportunities
            </p>
            <LiquidGlass
              tint={0}
              radius={28}
              className="mt-6 max-w-md shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]"
              style={{ backgroundColor: "rgb(27 122 67 / 0.72)" }}
              contentClassName="px-6 py-5 text-white"
            >
              <p className="text-2xl leading-tight font-semibold">
                Journal of Computing Technologies and Creative Content
              </p>
              <p className="mt-3 text-sm">e-ISSN : 2550-1550</p>
            </LiquidGlass>
            </div>
          </Rise>
        </div>
        <Rise delay={0.1}>
          <div className="mt-12 text-center">
            <p className="text-sm font-bold tracking-[0.16em] text-[#e8b84a]">Co-organisers</p>
            {coOrganisers.length === 0 ? (
              <p className="mt-3 text-sm text-white/70">To be announced</p>
            ) : (
              <ul className="mt-6 flex flex-wrap items-center justify-center gap-4">
                {coOrganisers.map((logo) => (
                  <li
                    key={logo._id}
                    className="flex h-20 items-center justify-center rounded-2xl bg-white px-4"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logo.image_src}
                      alt={logo.name}
                      className="h-12 w-auto max-w-40 object-contain"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Rise>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-4 text-xs text-white/60 sm:flex-row">
          <p>© 2027 I-CRIVE | Universiti Kuala Lumpur MIIT. All rights reserved.</p>
          <Link href="/portal/login" className="transition-colors hover:text-white">
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
