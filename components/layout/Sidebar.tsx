"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2, FolderOpen, FileSearch, BrainCircuit, FileText, UserCheck, Bot, Landmark,
} from "lucide-react";

// The focused demo flow: setup → upload → evidence → intelligence → draft → review (+ assistant)
const nav = [
  { href: "/onboarding", label: "Company Setup", icon: Building2, step: 1 },
  { href: "/data-room", label: "Upload & Data Room", icon: FolderOpen, step: 2 },
  { href: "/evidence", label: "Evidence & Extraction", icon: FileSearch, step: 3 },
  { href: "/intelligence", label: "IPO Intelligence", icon: BrainCircuit, step: 4 },
  { href: "/draft", label: "Draft Offer Document", icon: FileText, step: 5 },
  { href: "/merchant-review", label: "Merchant Banker Review", icon: UserCheck, step: 6 },
  { href: "/assistant", label: "AI Assistant", icon: Bot, step: 7 },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-300 flex flex-col min-h-screen no-print">
      <Link href="/" className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-800">
        <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Landmark size={17} className="text-white" />
        </span>
        <span>
          <span className="block text-white font-semibold leading-tight">IPO Saathi</span>
          <span className="block text-[10px] text-slate-400 leading-tight">SME IPO Intelligence</span>
        </span>
      </Link>
      <nav className="flex-1 py-4 px-2 space-y-1">
        {nav.map(({ href, label, icon: Icon, step }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                active ? "bg-blue-600 text-white font-medium" : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0 ${active ? "bg-white text-blue-700" : "bg-slate-800 text-slate-400"}`}>
                {step}
              </span>
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-slate-800 text-[10px] leading-relaxed text-slate-500">
        AI-assisted draft preparation aligned to the SME framework. Not legal or regulatory advice. Authorised intermediary review required.
      </div>
    </aside>
  );
}
