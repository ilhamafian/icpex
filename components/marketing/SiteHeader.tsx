"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconMenu2, IconX } from "@tabler/icons-react";

const CATEGORIES = [
  { href: "/categories/undergraduate", label: "Undergraduate" },
  { href: "/categories/postgraduate", label: "Postgraduate" },
];

const MORE = [
  { href: "/publications", label: "Publication Opportunities" },
  { href: "/guidelines", label: "Guidelines & Awards" },
  { href: "/committee", label: "Organising Committee" },
  { href: "/contact", label: "Contact Us" },
];

function navActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopMenu({
  label,
  hrefs,
  items,
}: {
  label: string;
  hrefs: string[];
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const active = hrefs.some((href) => navActive(pathname, href));

  return (
    <div className="group relative">
      <button
        type="button"
        className={`inline-flex items-center gap-1 text-[13px] font-semibold tracking-[0.14em] uppercase ${
          active ? "text-[#b8860b]" : "text-[#0c2340] hover:text-[#b8860b]"
        }`}
        aria-haspopup="true"
      >
        {label}
        <IconChevronDown className="size-3.5" aria-hidden />
      </button>
      <div className="invisible absolute top-full left-1/2 z-50 w-64 -translate-x-1/2 pt-3 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="rounded-xl bg-white p-2 text-sm shadow-xl ring-1 ring-black/10">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 font-medium ${
                navActive(pathname, item.href)
                  ? "bg-[#f6f1e4] text-[#8a6810]"
                  : "text-[#0c2340] hover:bg-[#f6f1e4]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <div ref={ref} className="relative flex">
      <button
        type="button"
        className="flex h-full items-center gap-1.5 bg-[#d6a11e] px-4 text-[12px] font-bold tracking-[0.12em] text-[#1a1408] uppercase transition-colors hover:bg-[#e2b43a] sm:px-6"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        Sign up/Login
        <IconChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 w-48 bg-white py-2 text-[#0c2340] shadow-xl ring-1 ring-black/10"
        >
          <Link
            role="menuitem"
            href="/register"
            className="block px-4 py-2.5 text-sm font-semibold hover:bg-[#f6f1e4]"
          >
            Register
          </Link>
          <Link
            role="menuitem"
            href="/portal/login"
            className="block px-4 py-2.5 text-sm font-semibold hover:bg-[#f6f1e4]"
          >
            Staff login
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const linkClass = (href: string) =>
    `text-[13px] font-semibold tracking-[0.14em] uppercase ${
      navActive(pathname, href) ? "text-[#b8860b]" : "text-[#0c2340] hover:text-[#b8860b]"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white text-[#0c2340] shadow-sm">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-[#0c2340] focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="flex h-[4.25rem] items-stretch">
        <div className="mx-auto flex min-w-0 flex-1 items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="I-CRIVE home">
            <Image
              src="/brand/logo.png"
              alt="I-CRIVE — Research, Innovation & Excellence"
              width={942}
              height={373}
              priority
              className="h-11 w-auto"
            />
          </Link>
          <nav className="ml-auto hidden items-center gap-6 lg:flex" aria-label="Primary">
            <Link href="/" className={linkClass("/")}>
              Home
            </Link>
            <Link href="/about" className={linkClass("/about")}>
              About
            </Link>
            <DesktopMenu label="Categories" hrefs={CATEGORIES.map((item) => item.href)} items={CATEGORIES} />
            <Link href="/fees" className={linkClass("/fees")}>
              Fees
            </Link>
            <Link href="/dates" className={linkClass("/dates")}>
              Dates
            </Link>
            <DesktopMenu label="More" hrefs={MORE.map((item) => item.href)} items={MORE} />
          </nav>
          <button
            type="button"
            className="ml-auto inline-flex size-10 items-center justify-center rounded-md text-[#0c2340] lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <IconX className="size-6" /> : <IconMenu2 className="size-6" />}
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
        <AccountMenu />
      </div>
      {mobileOpen ? (
        <nav id="mobile-nav" className="border-t bg-white px-4 py-4 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1 text-sm font-semibold">
            <Link href="/" className="rounded-lg px-3 py-2 hover:bg-[#f6f1e4]">
              Home
            </Link>
            <Link href="/about" className="rounded-lg px-3 py-2 hover:bg-[#f6f1e4]">
              About
            </Link>
            <p className="px-3 pt-3 text-xs tracking-[0.16em] text-[#b8860b] uppercase">Categories</p>
            {CATEGORIES.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 hover:bg-[#f6f1e4]">
                {item.label}
              </Link>
            ))}
            <Link href="/fees" className="rounded-lg px-3 py-2 hover:bg-[#f6f1e4]">
              Fees
            </Link>
            <Link href="/dates" className="rounded-lg px-3 py-2 hover:bg-[#f6f1e4]">
              Dates
            </Link>
            <p className="px-3 pt-3 text-xs tracking-[0.16em] text-[#b8860b] uppercase">More</p>
            {MORE.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 hover:bg-[#f6f1e4]">
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
