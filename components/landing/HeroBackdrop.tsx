/**
 * Photographic hero background for the SIIM landing page.
 *
 * Layers two cropped photo assets (served from /public/landing) over a warm
 * cream wash, matching the approved reference mock:
 *  - hero-skyline.jpg — SEBI tower + warehouse band, seated in the gap
 *    between the pitch column and the auth card.
 *  - hero-desk.jpg    — promoter's desk (laptop dashboard, ICDR regulations,
 *    draft prospectus, export cartons) anchored along the bottom.
 *
 * Every photo layer is feathered with CSS mask gradients so it melts into the
 * page instead of ending on a hard edge, keeping the headline, feature cards
 * and auth card fully legible on top.
 */
export default function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* ── warm dawn wash ── */}
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#fbf7ee_0%,#f3f1e8_38%,#eef1ea_70%,#e3ecef_100%)]" />

      {/* golden-hour glow, high behind the brand column */}
      <div className="absolute -top-40 left-[8%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.18),rgba(45,212,191,0.08)_42%,transparent_70%)] blur-[2px]" />
      {/* cool navy glow to seat the auth card on brand colour */}
      <div className="absolute top-1/4 right-[-8rem] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(30,58,95,0.12),transparent_66%)]" />

      {/* ── faint ledger / document grid ── */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.45]" aria-hidden>
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="rgba(30,58,95,0.05)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* ── SEBI tower / warehouse band, between pitch and auth card ── */}
      <div
        className="absolute top-0 left-[41%] hidden h-[86%] w-[25%] lg:block"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 16%, black 72%, transparent 98%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 16%, black 72%, transparent 98%)",
        }}
      >
        <div
          className="h-full w-full bg-cover bg-top"
          style={{
            backgroundImage: "url('/landing/hero-skyline.jpg')",
            maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)",
          }}
        />
      </div>

      {/* ── promoter's desk scene along the bottom ── */}
      <div
        className="absolute bottom-0 left-0 hidden h-[42%] w-[72%] md:block"
        style={{
          maskImage: "linear-gradient(to top, black 55%, transparent 98%)",
          WebkitMaskImage: "linear-gradient(to top, black 55%, transparent 98%)",
        }}
      >
        <div
          className="h-full w-full bg-cover bg-top"
          style={{
            backgroundImage: "url('/landing/hero-desk.jpg')",
            maskImage: "linear-gradient(to right, black 82%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, black 82%, transparent 100%)",
          }}
        />
      </div>

      {/* soft cream veil over the photo seams so copy stays legible */}
      <div className="absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(to_top,transparent_0%,transparent_62%,rgba(246,244,238,0.55)_100%)]" />

      {/* brand-green wave, bottom-right (mirrors the reference mock) */}
      <svg
        className="absolute bottom-0 right-0 w-[42%] opacity-70"
        viewBox="0 0 600 220"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M600,220 L600,40 C 480,10 380,120 240,150 C 140,171 60,200 0,220 Z"
          fill="rgba(15,118,110,0.10)"
        />
        <path
          d="M600,220 L600,90 C 500,70 400,160 270,180 C 180,194 90,208 30,220 Z"
          fill="rgba(45,212,191,0.12)"
        />
      </svg>
    </div>
  );
}
