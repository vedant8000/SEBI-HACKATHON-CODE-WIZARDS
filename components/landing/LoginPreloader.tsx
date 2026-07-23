"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Full-screen login preloader: a percentage counter eases 0 → 100 while a
 * cream "liquid" with an animated wave crest rises over the giant wordmark
 * (mix-blend-difference inverts the type as the fill passes through it).
 *
 * Orchestration lives in PreloaderProvider: this component reports the end
 * of the count via `onCountDone` and slides up when `exiting` flips true —
 * the provider only flips it after the destination route has committed, so
 * the reveal always shows the new page.
 *
 * Rendered through a portal to <body>: an ancestor with backdrop-blur (like
 * the auth card) would otherwise trap a position:fixed overlay inside it.
 */

const COUNT_MS = 2800; // 0 → 100 duration
const HOLD_MS = 300; //   pause at 100% before reporting done
export const EXIT_MS = 700; // slide-up reveal duration

const NAVY = "#132a47";
const CREAM = "#f6f1e7";

const WAVE_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 60" preserveAspectRatio="none">` +
    `<path d="M0 32 C100 8 200 56 300 32 C400 8 500 56 600 32 C700 8 800 56 900 32 C1000 8 1100 56 1200 32 L1200 60 L0 60 Z" fill="${CREAM}"/>` +
    `</svg>`
);

export default function LoginPreloader({
  title,
  exiting,
  onCountDone,
}: {
  title: string;
  exiting: boolean;
  onCountDone: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(onCountDone);

  useEffect(() => {
    doneRef.current = onCountDone;
  }, [onCountDone]);

  useEffect(() => {
    let raf = 0;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const start = performance.now();
    const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      setProgress(Math.round(easeOutCubic(p) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else hold = setTimeout(() => doneRef.current(), HOLD_MS);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (hold) clearTimeout(hold);
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-hidden will-change-transform"
      style={{
        background: NAVY,
        transform: exiting ? "translateY(-100%)" : "translateY(0)",
        transition: `transform ${EXIT_MS}ms cubic-bezier(0.76, 0, 0.24, 1)`,
      }}
      aria-live="polite"
      aria-label={title}
    >
      {/* rising liquid fill */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: `${progress}%`, transition: "height 140ms linear" }}
      >
        <div
          className="absolute left-0 h-[54px] w-[200%]"
          style={{
            top: "-53px",
            backgroundImage: `url("data:image/svg+xml,${WAVE_SVG}")`,
            backgroundSize: "50% 100%",
            backgroundRepeat: "repeat-x",
            animation: "siim-wave 2.4s linear infinite",
          }}
        />
        <div className="absolute inset-0" style={{ background: CREAM }} />
      </div>

      {/* giant logo — white-on-transparent render of the brand mark, so
          mix-blend-difference inverts it as the liquid passes through it */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/siim-logo-white.png"
          alt="SIIM"
          className="select-none mix-blend-difference"
          style={{
            width: "clamp(16rem, 38vw, 34rem)",
            height: "auto",
            animation: "siim-breathe 2.4s ease-in-out infinite",
          }}
        />
      </div>

      {/* status line — top left */}
      <div className="absolute left-6 top-6 md:left-10 md:top-9 flex items-center gap-3 text-white mix-blend-difference">
        <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
        <span className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.35em]">
          {title}
        </span>
      </div>

      {/* percentage counter — bottom right */}
      <div className="absolute bottom-2 right-6 md:right-10 flex items-baseline text-white mix-blend-difference">
        <span
          className="font-serif font-black tabular-nums leading-none"
          style={{ fontSize: "clamp(4rem, 14vw, 12rem)" }}
        >
          {progress}
        </span>
        <span
          className="font-serif font-bold leading-none"
          style={{ fontSize: "clamp(1.5rem, 4vw, 3.5rem)" }}
        >
          %
        </span>
      </div>

      <style>{`
        @keyframes siim-wave {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes siim-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.02); }
        }
      `}</style>
    </div>,
    document.body
  );
}
