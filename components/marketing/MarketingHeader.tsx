"use client";

import { usePathname } from "next/navigation";

import { SiteHeader } from "@/components/marketing/SiteHeader";

/** Registration is a focused flow, so it keeps a back link instead of the site nav. */
export function MarketingHeader() {
  const pathname = usePathname();
  if (pathname === "/register" || pathname.startsWith("/register/")) return null;
  return <SiteHeader />;
}
