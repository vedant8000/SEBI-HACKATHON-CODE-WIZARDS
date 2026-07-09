"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, FolderOpen, FileSearch, Grid3x3, Gauge,
  LayoutGrid, AlertTriangle, Calculator, GitBranch, Target, FileText,
  MessageSquareWarning, Bot, UserCheck, Download, TrendingUp, Settings, Landmark,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/onboarding", label: "Company Setup", icon: Building2 },
  { href: "/data-room", label: "Upload & Data Room", icon: FolderOpen },
  { href: "/evidence", label: "Extraction & Evidence", icon: FileSearch },
  { href: "/coverage", label: "IPO Coverage Matrix", icon: LayoutGrid },
  { href: "/readiness", label: "IPO Readiness", icon: Gauge },
  { href: "/compliance-heatmap", label: "Compliance Heatmap", icon: Grid3x3 },
  { href: "/gap-report", label: "Gap Report", icon: AlertTriangle },
  { href: "/financial-checks", label: "Financial Consistency", icon: Calculator },
  { href: "/rpt-risk", label: "RPT Risk Engine", icon: GitBranch },
  { href: "/objects-builder", label: "Objects of Issue", icon: Target },
  { href: "/draft", label: "Draft Offer Document", icon: FileText },
  { href: "/observations", label: "Exchange Observations", icon: MessageSquareWarning },
  { href: "/summary", label: "Promoter Assistant", icon: Bot },
  { href: "/merchant-review", label: "Merchant Banker Review", icon: UserCheck },
  { href: "/exports", label: "Export Center", icon: Download },
  { href: "/valuation", label: "Valuation Studio", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col min-h-screen no-print">
      <Link href="/" className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-800">
        <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Landmark size={17} className="text-white" />
        </span>
        <span>
          <span className="block text-white font-semibold leading-tight">IPO Saathi</span>
          <span className="block text-[10px] text-slate-400 leading-tight">SME IPO Intelligence</span>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                active ? "bg-blue-600 text-white font-medium" : "hover:bg-slate-800 hover:text-white"
              }`}
            >
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
