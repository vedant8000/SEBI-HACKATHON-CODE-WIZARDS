"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2, FileSearch, BrainCircuit, FileText, UserCheck, Bot,
  UserRound, HelpCircle, Settings, LogOut,
} from "lucide-react";

// The focused demo flow: setup (with upload) → evidence → intelligence → draft → review (+ assistant)
const nav = [
  { href: "/onboarding", label: "Company Setup & Upload", icon: Building2, step: 1, tile: "bg-blue-50 text-blue-700 border-blue-100" },
  { href: "/evidence", label: "Evidence & Extraction", icon: FileSearch, step: 2, tile: "bg-cyan-50 text-cyan-700 border-cyan-100" },
  { href: "/intelligence", label: "IPO Intelligence", icon: BrainCircuit, step: 3, tile: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { href: "/draft", label: "Draft Offer Document", icon: FileText, step: 4, tile: "bg-violet-50 text-violet-600 border-violet-100" },
  { href: "/merchant-review", label: "Merchant Banker Review", icon: UserCheck, step: 5, tile: "bg-slate-100 text-[#1e3a5f] border-slate-200" },
  { href: "/assistant", label: "AI Assistant", icon: Bot, step: 6, tile: "bg-teal-50 text-teal-700 border-teal-100" },
];

/**
 * Capital-markets scene for the sidebar's idle space: a financial-district
 * skyline, candlestick cluster and a rising growth curve — the world an SME
 * IPO lives in.
 */
function SidebarScene() {
  return (
    <svg viewBox="0 0 256 130" className="w-full shrink-0 pointer-events-none" aria-hidden>
      {/* skyline */}
      <g fill="#1e3a5f">
        <rect x="18" y="58" width="20" height="72" opacity="0.14" rx="1.5" />
        <rect x="44" y="38" width="26" height="92" opacity="0.22" rx="1.5" />
        <rect x="76" y="66" width="18" height="64" opacity="0.13" rx="1.5" />
        <rect x="100" y="48" width="24" height="82" opacity="0.19" rx="1.5" />
        <rect x="130" y="72" width="18" height="58" opacity="0.12" rx="1.5" />
        <rect x="154" y="56" width="22" height="74" opacity="0.17" rx="1.5" />
        <rect x="182" y="76" width="16" height="54" opacity="0.11" rx="1.5" />
      </g>
      {/* lit windows on the two tallest towers */}
      <g fill="#60a5fa" opacity="0.7">
        {[0, 1, 2].map((r) => (
          <g key={r}>
            <rect x={49} y={46 + r * 16} width="5" height="7" rx="1" />
            <rect x={58} y={46 + r * 16} width="5" height="7" rx="1" />
            <rect x={105} y={56 + r * 16} width="5" height="7" rx="1" />
            <rect x={114} y={56 + r * 16} width="5" height="7" rx="1" />
          </g>
        ))}
      </g>
      {/* candlesticks */}
      <g stroke="#3b82f6" strokeWidth="1.5" opacity="0.55">
        {[
          [206, 78, 96], [218, 68, 88], [230, 74, 94], [242, 58, 80],
        ].map(([x, top, bot], i) => (
          <g key={x}>
            <line x1={x} y1={top - 6} x2={x} y2={bot + 6} />
            <rect x={x - 3.5} y={top} width="7" height={bot - top} fill={i % 2 ? "#3b82f6" : "#eff6ff"} />
          </g>
        ))}
      </g>
      {/* rising growth curve with arrowhead */}
      <path
        d="M8,118 C 60,112 110,102 160,80 C 196,64 224,48 244,34"
        fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" opacity="0.85"
      />
      <path d="M244,34 L233,35.5 M244,34 L241,44" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" fill="none" />
      {/* milestone dots */}
      {[[62, 111], [128, 92], [186, 62]].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="3" fill="#2563eb" opacity="0.8" />
      ))}
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [who, setWho] = useState({ name: "SIIM User", role: "SME Promoter" });

  useEffect(() => {
    try {
      setWho({
        name: localStorage.getItem("siim.userName") || "SIIM User",
        role: localStorage.getItem("siim.roleLabel") || "SME Promoter",
      });
    } catch {
      /* localStorage unavailable — keep defaults */
    }
  }, []);

  const logout = () => {
    try {
      ["siim.role", "siim.roleLabel", "siim.userName"].forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    router.push("/");
  };

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto bg-[#f2f7fc] border-r border-slate-200 flex flex-col no-print">
      {/* brand */}
      <Link href="/" className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/siim-mark.png" alt="" className="h-11 w-auto drop-shadow-sm" />
        <span>
          <span className="block text-[#1e3a5f] font-bold text-xl leading-tight font-serif tracking-tight">SIIM</span>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-700 leading-tight">
            SME IPO Intelligence Mitra
          </span>
        </span>
      </Link>

      {/* profile card */}
      <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 border border-blue-100 text-[#1e3a5f]">
          <UserRound size={17} />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-bold text-[#1e3a5f]">{who.name}</span>
          <span className="block truncate text-[11px] text-slate-500">{who.role}</span>
        </span>
      </div>

      {/* journey nav */}
      <nav className="px-3 space-y-1.5">
        {nav.map(({ href, label, icon: Icon, step, tile }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-all ${
                active
                  ? "bg-gradient-to-r from-[#1e3a5f] to-[#2d5c94] text-white font-semibold shadow-lg shadow-blue-900/25"
                  : "text-slate-600 hover:bg-blue-50/70 hover:text-slate-900"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors ${
                  active ? "bg-white/15 border-white/20 text-white" : tile
                }`}
              >
                <Icon size={15} />
              </span>
              <span className="flex-1 leading-snug">{label}</span>
              <span
                className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-blue-100/70 text-blue-700/70"
                }`}
              >
                {step}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* idle space → market skyline & growth curve */}
      <div className="flex-1 flex flex-col justify-end px-2 pb-1">
        <SidebarScene />
      </div>

      {/* utilities */}
      <div className="border-t border-slate-200 bg-[#e8f0f9] px-3 py-2.5 space-y-0.5">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-blue-50 hover:text-slate-900">
          <HelpCircle size={14} className="text-blue-700" /> Learn about SIIM
        </Link>
        <Link href="/settings" className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-blue-50 hover:text-slate-900">
          <Settings size={14} className="text-slate-400" /> Settings
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-red-50 hover:text-red-700 text-left">
          <LogOut size={14} className="text-red-400" /> Log out
        </button>
      </div>
    </aside>
  );
}
