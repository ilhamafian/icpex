"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { motion } from "motion/react";

import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  Navbar,
  NavbarButton,
  NavBody,
} from "@/components/ui/resizable-navbar";
import { cn } from "@/lib/utils";

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

const GLASS_SHADOW =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";

/** Navy fill so the scrolled bar refracts the page instead of turning solid white. */
const scrolledTint = "rgb(7 17 29 / 0.55)";

const linkClassName =
  "text-white hover:text-white group-data-[state=scrolled]/nav:text-zinc-100 group-data-[state=scrolled]/nav:hover:text-white";

function navActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function navSurface(visible: boolean) {
  if (!visible) return null;
  return (
    <LiquidGlass
      aria-hidden
      className="pointer-events-none absolute inset-0"
      radius={999}
      tint={0}
      style={{ backgroundColor: scrolledTint }}
    />
  );
}

function BrandLogo() {
  return (
    <Link href="/" className="relative z-20 shrink-0" aria-label="I-CRIVE home">
      <Image
        src="/brand/logo-on-dark.png"
        alt="I-CRIVE — Research, Innovation & Excellence"
        width={942}
        height={373}
        priority
        className="h-10 w-auto sm:h-11"
      />
    </Link>
  );
}

function RegisterGlassButton({
  className,
  contentClassName,
  onClick,
}: {
  className?: string;
  contentClassName?: string;
  onClick?: () => void;
}) {
  return (
    <Link href="/register" onClick={onClick} className={cn("inline-flex rounded-full", className)}>
      <LiquidGlass
        tint={0.2}
        className={cn(GLASS_SHADOW, "w-full text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100")}
        contentClassName={cn(
          "flex items-center justify-center px-5 py-2 text-sm font-medium [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]",
          contentClassName
        )}
      >
        Register
      </LiquidGlass>
    </Link>
  );
}

function HoverPill() {
  return (
    <motion.div
      layoutId="nav-hover"
      className="absolute inset-0 h-full w-full rounded-full bg-white/10"
    />
  );
}

function DesktopNav() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  const itemClass = (active: boolean) =>
    cn(
      "relative px-3 py-2 text-sm font-medium text-inherit xl:px-4",
      active && "text-[#e8b84a]"
    );

  return (
    <div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "absolute inset-0 hidden flex-1 flex-row items-center justify-center text-sm font-medium transition duration-200 lg:flex",
        linkClassName
      )}
    >
      <Link
        href="/"
        onMouseEnter={() => setHovered("home")}
        className={itemClass(navActive(pathname, "/"))}
      >
        {hovered === "home" ? <HoverPill /> : null}
        <span className="relative z-20">Home</span>
      </Link>
      <Link
        href="/about"
        onMouseEnter={() => setHovered("about")}
        className={itemClass(navActive(pathname, "/about"))}
      >
        {hovered === "about" ? <HoverPill /> : null}
        <span className="relative z-20">About</span>
      </Link>
      <div
        className="group relative"
        onMouseEnter={() => setHovered("categories")}
      >
        <button
          type="button"
          className={itemClass(CATEGORIES.some((item) => navActive(pathname, item.href)))}
          aria-haspopup="true"
        >
          {hovered === "categories" ? <HoverPill /> : null}
          <span className="relative z-20 inline-flex items-center gap-1">
            Categories
            <IconChevronDown className="size-3.5" aria-hidden />
          </span>
        </button>
        <Dropdown items={CATEGORIES} pathname={pathname} />
      </div>
      <Link
        href="/fees"
        onMouseEnter={() => setHovered("fees")}
        className={itemClass(navActive(pathname, "/fees"))}
      >
        {hovered === "fees" ? <HoverPill /> : null}
        <span className="relative z-20">Fees</span>
      </Link>
      <Link
        href="/dates"
        onMouseEnter={() => setHovered("dates")}
        className={itemClass(navActive(pathname, "/dates"))}
      >
        {hovered === "dates" ? <HoverPill /> : null}
        <span className="relative z-20">Dates</span>
      </Link>
      <div className="group relative" onMouseEnter={() => setHovered("more")}>
        <button
          type="button"
          className={itemClass(MORE.some((item) => navActive(pathname, item.href)))}
          aria-haspopup="true"
        >
          {hovered === "more" ? <HoverPill /> : null}
          <span className="relative z-20 inline-flex items-center gap-1">
            More
            <IconChevronDown className="size-3.5" aria-hidden />
          </span>
        </button>
        <Dropdown items={MORE} pathname={pathname} />
      </div>
    </div>
  );
}

function Dropdown({
  items,
  pathname,
}: {
  items: { href: string; label: string }[];
  pathname: string;
}) {
  return (
    <div className="invisible absolute top-full left-1/2 z-50 w-64 -translate-x-1/2 pt-3 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
      <div className="rounded-2xl bg-[#07111d]/95 p-2 text-sm shadow-xl ring-1 ring-white/10">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-xl px-3 py-2 font-medium",
              navActive(pathname, item.href)
                ? "bg-white/10 text-[#e8b84a]"
                : "text-white hover:bg-white/10"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-[#0c2340] focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar className="top-4 z-50">
      <NavBody
        surface={navSurface}
        scrolledWidth="min(100%, 76rem)"
        minWidth="0px"
      >
        <BrandLogo />
        <DesktopNav />
        <div className="relative z-20 flex items-center gap-2">
          <NavbarButton
            as={Link}
            href="/portal/login"
            variant="secondary"
            className={linkClassName}
          >
            Staff login
          </NavbarButton>
          <RegisterGlassButton />
        </div>
      </NavBody>

      <MobileNav surface={navSurface}>
        <MobileNavHeader className="px-4">
          <BrandLogo />
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className={linkClassName}
          />
        </MobileNavHeader>
        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={closeMobileMenu}
          className="bg-[#07111d] text-white"
        >
          <MobileLink href="/" onClick={closeMobileMenu}>
            Home
          </MobileLink>
          <MobileLink href="/about" onClick={closeMobileMenu}>
            About
          </MobileLink>
          <p className="px-1 pt-2 text-xs font-semibold tracking-[0.16em] text-[#e8b84a] uppercase">
            Categories
          </p>
          {CATEGORIES.map((item) => (
            <MobileLink key={item.href} href={item.href} onClick={closeMobileMenu}>
              {item.label}
            </MobileLink>
          ))}
          <MobileLink href="/fees" onClick={closeMobileMenu}>
            Fees
          </MobileLink>
          <MobileLink href="/dates" onClick={closeMobileMenu}>
            Dates
          </MobileLink>
          <p className="px-1 pt-2 text-xs font-semibold tracking-[0.16em] text-[#e8b84a] uppercase">
            More
          </p>
          {MORE.map((item) => (
            <MobileLink key={item.href} href={item.href} onClick={closeMobileMenu}>
              {item.label}
            </MobileLink>
          ))}
          <div className="flex w-full flex-col gap-2 pt-2">
            <NavbarButton
              as={Link}
              href="/portal/login"
              variant="secondary"
              className="w-full text-white"
              onClick={closeMobileMenu}
            >
              Staff login
            </NavbarButton>
            <RegisterGlassButton
              className="w-full"
              contentClassName="w-full py-3"
              onClick={closeMobileMenu}
            />
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
    </>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: string;
}) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "block w-full text-sm",
        navActive(pathname, href) ? "text-[#e8b84a]" : "text-zinc-200"
      )}
    >
      {children}
    </Link>
  );
}
