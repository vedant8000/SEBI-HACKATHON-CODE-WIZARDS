"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Mail, Lock, Eye, EyeOff, PlayCircle, ChevronRight,
  UserCog, Briefcase, ArrowRight,
} from "lucide-react";

type Mode = "login" | "register";
type RoleKey = "PROMOTER" | "MERCHANT_BANKER";

const ROLES: {
  key: RoleKey;
  label: string;
  blurb: string;
  route: string;
  icon: typeof UserCog;
}[] = [
  {
    key: "PROMOTER",
    label: "SME Promoter",
    blurb: "Prepare your company's offer document from your own records.",
    route: "/onboarding",
    icon: UserCog,
  },
  {
    key: "MERCHANT_BANKER",
    label: "Merchant Banker",
    blurb: "Review, flag and approve draft offer documents for filing.",
    route: "/merchant-review",
    icon: Briefcase,
  },
];

/**
 * Reference-style auth card for the SIIM landing page.
 *
 * Login is a lightweight prototype gate (no backend yet). Register segregates
 * by role via a dropdown: SME Promoters land in company onboarding, Merchant
 * Bankers land in the review workspace. The chosen role is remembered locally
 * so the rest of the prototype can adapt the experience.
 */
export default function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<RoleKey>("PROMOTER");
  const [showPwd, setShowPwd] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const activeRole = ROLES.find((r) => r.key === role)!;

  function enter(target: RoleKey) {
    const r = ROLES.find((x) => x.key === target)!;
    // Display name for the workspace: registered full name, else the email's
    // local part ("amit.jindal@…" → "Amit Jindal").
    const derived = email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    try {
      localStorage.setItem("siim.role", r.key);
      localStorage.setItem("siim.roleLabel", r.label);
      const display = (mode === "register" ? fullName.trim() : "") || derived;
      if (display) localStorage.setItem("siim.userName", display);
    } catch {
      /* localStorage may be unavailable — routing still works */
    }
    router.push(r.route);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Login has no stored role selector; default to promoter onboarding.
    enter(mode === "register" ? role : "PROMOTER");
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl shadow-[#1e3a5f]/10 p-7 md:p-9">
      {/* language toggle */}
      <div className="flex items-center justify-end gap-3 text-sm mb-4">
        <button className="font-semibold text-[#0f766e] border-b-2 border-[#0f766e] pb-0.5">
          English
        </button>
        <span className="text-slate-300">|</span>
        <button className="text-slate-500 hover:text-slate-800 transition-colors">
          हिन्दी
        </button>
      </div>

      <h2 className="text-3xl font-bold text-[#1e3a5f] tracking-tight font-serif">
        {mode === "login" ? "Welcome to SIIM" : "Create your account"}
      </h2>
      <p className="text-sm text-slate-500 mt-1.5">
        For SME Promoters &amp; Merchant Bankers
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {/* Role dropdown — only when registering */}
        {mode === "register" && (
          <div>
            <label className="block text-sm font-semibold text-[#1e3a5f] mb-1.5">
              I am registering as
            </label>
            <div className="relative">
              <activeRole.icon
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0f766e]"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RoleKey)}
                className="w-full appearance-none pl-10 pr-9 py-3 text-sm rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40 focus:border-[#1e3a5f]"
              >
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronRight
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none"
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
              {activeRole.blurb}
            </p>
          </div>
        )}

        {mode === "register" && (
          <div>
            <label className="block text-sm font-semibold text-[#1e3a5f] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40 focus:border-[#1e3a5f]"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-[#1e3a5f] mb-1.5">
            Email / User ID
          </label>
          <div className="relative">
            <Mail
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email or user ID"
              className="w-full pl-10 pr-3.5 py-3 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40 focus:border-[#1e3a5f]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1e3a5f] mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type={showPwd ? "text" : "password"}
              required
              placeholder="Enter your password"
              className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40 focus:border-[#1e3a5f]"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="group w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#1e3a5f]/25 hover:bg-[#24466f] transition-colors"
        >
          {mode === "login" ? "Log In" : `Register as ${activeRole.label}`}
          <ArrowRight
            size={15}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        {mode === "login" ? (
          <button
            onClick={() => setMode("register")}
            className="text-slate-600"
          >
            New here?{" "}
            <span className="font-semibold text-[#0f766e] hover:underline">
              Register
            </span>
          </button>
        ) : (
          <button
            onClick={() => setMode("login")}
            className="text-slate-600"
          >
            Already registered?{" "}
            <span className="font-semibold text-[#0f766e] hover:underline">
              Log In
            </span>
          </button>
        )}
        <button className="font-medium text-slate-500 hover:text-slate-700">
          Forgot Password?
        </button>
      </div>

      <hr className="mt-5 border-stone-200" />

      {/* learn about SIIM */}
      <button
        onClick={() => document.getElementById("workflow")?.scrollIntoView({ behavior: "smooth" })}
        className="mt-6 w-full flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3.5 text-left hover:bg-emerald-50 transition-colors"
      >
        <PlayCircle size={30} className="text-emerald-600 shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-[#1e3a5f]">
            Learn about SIIM
          </div>
          <div className="text-[11px] text-slate-500">
            See the workflow and platform overview
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-400" />
      </button>
    </div>
  );
}
