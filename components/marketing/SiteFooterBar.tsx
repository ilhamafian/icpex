import Link from "next/link";

export function SiteFooterBar() {
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 py-3 text-center text-xs text-white/55 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-6 md:text-left">
        <p>© 2027 I-CRIVE · Universiti Kuala Lumpur MIIT. All rights reserved.</p>
        <p className="text-white/70 md:text-center">
          Made with <span aria-hidden="true">❤️</span>
          <span className="sr-only">love</span> by Lofy
        </p>
        <div className="md:justify-self-end">
          <Link
            href="/portal/login"
            className="inline-flex h-8 items-center justify-center rounded-full bg-[#d6a11e] px-4 text-xs font-bold tracking-wide text-[#1a1408] transition-colors hover:bg-[#e2b43a]"
          >
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
