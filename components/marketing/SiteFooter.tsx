import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

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

const labelClass = "text-[0.68rem] font-bold tracking-[0.16em] text-[#e8b84a] uppercase";

export async function SiteFooter() {
  await headers();
  const coOrganisers = await loadCoOrganisers();

  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10 lg:py-7">
        <div>
          <p className={labelClass}>Organised by</p>
          <div className="mt-3 flex items-center gap-3">
            <Image
              src="/brand/unikl-logo.png"
              alt="Universiti Kuala Lumpur"
              width={473}
              height={295}
              className="h-12 w-auto shrink-0"
            />
            <p className="text-xs leading-snug text-white/70">
              Research & Innovation Section, Universiti Kuala Lumpur Malaysian Institute of
              Information Technology.
            </p>
          </div>
        </div>

        <div>
          <p className={labelClass}>Publication</p>
          <div className="mt-3 border-l-2 border-[#1b7a43] pl-3">
            <p className="text-sm leading-snug font-semibold text-white">
              Journal of Computing Technologies and Creative Content
            </p>
            <p className="mt-1 text-xs text-white/60">e-ISSN 2550-1550</p>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <p className={labelClass}>Co-organisers</p>
          {coOrganisers.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">To be announced</p>
          ) : (
            <ul className="mt-3 flex flex-wrap items-center gap-2">
              {coOrganisers.map((logo) => (
                <li
                  key={logo._id}
                  className="flex h-12 items-center justify-center rounded-xl bg-white px-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.image_src}
                    alt={logo.name}
                    className="h-8 w-auto max-w-28 object-contain"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-3 text-xs text-white/55 sm:flex-row">
          <p>© 2027 I-CRIVE · Universiti Kuala Lumpur MIIT. All rights reserved.</p>
          <Link href="/portal/login" className="transition-colors hover:text-white">
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
