import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Organised by • Publication • Co-Organisers
        </h2>
        <div className="mt-12 grid items-start gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#e8b84a]">Organised by</p>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex size-[4.5rem] shrink-0 items-center justify-center rounded-full border-[3px] border-[#1e4b9b] bg-white text-center text-[11px] leading-tight font-bold text-[#1e4b9b]">
                UniKL
                <br />
                MIIT
              </div>
              <div>
                <p className="text-3xl font-black tracking-tight">
                  <span className="text-[#2f5fbf]">Uni</span>
                  <span className="text-[#f0a202]">KL</span>
                </p>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#8ea0c4] uppercase">
                  Universiti
                  <br />
                  Kuala Lumpur
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm text-white/70">
              Research & Innovation Section, Universiti Kuala Lumpur Malaysian Institute of
              Information Technology.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#e8b84a]">
              Publication opportunities
            </p>
            <div className="mt-6 max-w-md rounded-md bg-[#1b7a43] px-6 py-5 text-white shadow-lg">
              <p className="text-2xl leading-tight font-semibold">
                Journal of Computing Technologies and Creative Content
              </p>
              <p className="mt-3 text-sm">e-ISSN : 2550-1550</p>
            </div>
          </div>
        </div>
        <div className="mt-12 text-center">
          <p className="text-sm font-bold tracking-[0.16em] text-[#e8b84a]">Co-organisers</p>
          <p className="mt-3 text-sm text-white/70">To be announced</p>
        </div>
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
