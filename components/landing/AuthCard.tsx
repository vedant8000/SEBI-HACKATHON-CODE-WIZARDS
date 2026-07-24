"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Mail, Lock, Eye, EyeOff, PlayCircle, ChevronRight,
  UserCog, Briefcase, ArrowRight,
} from "lucide-react";
import { usePreloader } from "./PreloaderProvider";
import { useLanguage, type Lang } from "./LanguageProvider";

type Mode = "login" | "register";
type RoleKey = "PROMOTER" | "MERCHANT_BANKER";

const ROLES: { key: RoleKey; route: string; icon: typeof UserCog }[] = [
  { key: "PROMOTER", route: "/onboarding", icon: UserCog },
  { key: "MERCHANT_BANKER", route: "/banker", icon: Briefcase },
];

/** All card copy in both languages — the EN | हिन्दी toggle swaps this. */
const T: Record<Lang, {
  welcome: string; createAccount: string; tagline: string;
  registeringAs: string; fullName: string; fullNamePh: string;
  emailLabel: string; emailPh: string; password: string; passwordPh: string;
  login: string; registerAs: string; pleaseWait: string;
  newHere: string; registerLink: string; already: string; loginLink: string;
  forgot: string; learnTitle: string; learnSub: string;
  errGeneric: string; errNetwork: string;
  loadingTitle: string; loadingSub: string;
  roles: Record<RoleKey, { label: string; blurb: string }>;
}> = {
  en: {
    welcome: "Welcome to SIIM",
    createAccount: "Create your account",
    tagline: "For SME Promoters & Merchant Bankers",
    registeringAs: "I am registering as",
    fullName: "Full Name",
    fullNamePh: "Enter your full name",
    emailLabel: "Email / User ID",
    emailPh: "Enter your email or user ID",
    password: "Password",
    passwordPh: "Enter your password",
    login: "Log In",
    registerAs: "Register as {role}",
    pleaseWait: "Please wait…",
    newHere: "New here?",
    registerLink: "Register",
    already: "Already registered?",
    loginLink: "Log In",
    forgot: "Forgot Password?",
    learnTitle: "Learn about SIIM",
    learnSub: "See the workflow and platform overview",
    errGeneric: "Something went wrong. Please try again.",
    errNetwork: "Could not reach the server. Please try again.",
    loadingTitle: "Logging you in…",
    loadingSub: "Setting up your secure workspace",
    roles: {
      PROMOTER: {
        label: "SME Promoter",
        blurb: "Prepare your company's offer document from your own records.",
      },
      MERCHANT_BANKER: {
        label: "Merchant Banker",
        blurb: "Review, flag and approve draft offer documents for filing.",
      },
    },
  },
  hi: {
    welcome: "SIIM में आपका स्वागत है",
    createAccount: "अपना खाता बनाएँ",
    tagline: "SME प्रमोटरों और मर्चेंट बैंकरों के लिए",
    registeringAs: "मैं इस रूप में पंजीकरण कर रहा/रही हूँ",
    fullName: "पूरा नाम",
    fullNamePh: "अपना पूरा नाम दर्ज करें",
    emailLabel: "ईमेल / यूज़र आईडी",
    emailPh: "अपना ईमेल या यूज़र आईडी दर्ज करें",
    password: "पासवर्ड",
    passwordPh: "अपना पासवर्ड दर्ज करें",
    login: "लॉग इन करें",
    registerAs: "{role} के रूप में पंजीकरण करें",
    pleaseWait: "कृपया प्रतीक्षा करें…",
    newHere: "नए हैं?",
    registerLink: "पंजीकरण करें",
    already: "पहले से पंजीकृत?",
    loginLink: "लॉग इन",
    forgot: "पासवर्ड भूल गए?",
    learnTitle: "SIIM के बारे में जानें",
    learnSub: "वर्कफ़्लो और प्लेटफ़ॉर्म का अवलोकन देखें",
    errGeneric: "कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
    errNetwork: "सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।",
    loadingTitle: "लॉग इन हो रहा है…",
    loadingSub: "आपका सुरक्षित कार्यक्षेत्र तैयार किया जा रहा है",
    roles: {
      PROMOTER: {
        label: "SME प्रमोटर",
        blurb: "अपने रिकॉर्ड से अपनी कंपनी का ऑफ़र दस्तावेज़ तैयार करें।",
      },
      MERCHANT_BANKER: {
        label: "मर्चेंट बैंकर",
        blurb: "फाइलिंग हेतु ड्राफ़्ट ऑफ़र दस्तावेज़ों की समीक्षा, फ़्लैग और स्वीकृति करें।",
      },
    },
  },
};

/**
 * Auth card for the SIIM landing page, backed by /api/auth (MongoDB users,
 * bcrypt-hashed passwords, JWT session cookie). Register segregates by role
 * via a dropdown: SME Promoters land in company onboarding, Merchant Bankers
 * land in the review workspace. Login routes by the role stored on the
 * account. The role/name are mirrored to localStorage so the rest of the
 * client experience can adapt without a round-trip.
 */
export default function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<RoleKey>("PROMOTER");
  // Language is shared with the rest of the landing page via LanguageProvider
  // (the toggle here switches the whole page); local state is the fallback
  // if the card is ever rendered outside the provider.
  const [localLang, setLocalLang] = useState<Lang>("en");
  const langCtx = useLanguage();
  const lang = langCtx?.lang ?? localLang;
  const setLang = langCtx?.setLang ?? setLocalLang;
  const [showPwd, setShowPwd] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const preloader = usePreloader();

  const t = T[lang];
  const activeRole = ROLES.find((r) => r.key === role)!;

  function switchLang(next: Lang) {
    setLang(next);
    try { localStorage.setItem("siim.lang", next); } catch { /* ignore */ }
  }

  function enter(target: RoleKey, displayName: string) {
    const r = ROLES.find((x) => x.key === target)!;
    try {
      localStorage.setItem("siim.role", r.key);
      // Workspace chrome reads the English label regardless of card language.
      localStorage.setItem("siim.roleLabel", T.en.roles[r.key].label);
      if (displayName) localStorage.setItem("siim.userName", displayName);
    } catch {
      /* localStorage may be unavailable — routing still works */
    }
    // Preloader covers the screen until the workspace route has committed,
    // then slides up. Fallback to a plain push if the provider is absent.
    if (preloader) preloader.start({ title: t.loadingTitle, href: r.route });
    else router.push(r.route);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? { name: fullName, email, password, role }
            : { email, password }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t.errGeneric);
        setBusy(false);
        return;
      }
      // Hand over to the full-screen preloader; it routes when finished.
      enter(data.user.role as RoleKey, data.user.name ?? "");
    } catch {
      setError(t.errNetwork);
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl shadow-[#1e3a5f]/10 p-7 md:p-9">
      {/* language toggle — one pill switch: English (left) ⇄ हिन्दी (right) */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          role="switch"
          aria-checked={lang === "hi"}
          aria-label="Switch language"
          onClick={() => switchLang(lang === "en" ? "hi" : "en")}
          className="relative grid grid-cols-2 items-center rounded-full border border-slate-200 bg-slate-100 p-1 text-xs font-semibold select-none cursor-pointer"
        >
          {/* sliding thumb */}
          <span
            aria-hidden
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm border border-slate-200/70 transition-transform duration-300 ease-out ${
              lang === "hi" ? "translate-x-full" : ""
            }`}
          />
          <span
            className={`relative z-10 px-3.5 py-1.5 text-center transition-colors duration-300 ${
              lang === "en" ? "text-[#0f766e]" : "text-slate-500"
            }`}
          >
            English
          </span>
          <span
            className={`relative z-10 px-3.5 py-1.5 text-center transition-colors duration-300 ${
              lang === "hi" ? "text-[#0f766e]" : "text-slate-500"
            }`}
          >
            हिन्दी
          </span>
        </button>
      </div>

      <h2 className="text-3xl font-bold text-[#1e3a5f] tracking-tight font-serif">
        {mode === "login" ? t.welcome : t.createAccount}
      </h2>
      <p className="text-sm text-slate-500 mt-1.5">{t.tagline}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {/* Role dropdown — only when registering */}
        {mode === "register" && (
          <div>
            <label className="block text-sm font-semibold text-[#1e3a5f] mb-1.5">
              {t.registeringAs}
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
                    {t.roles[r.key].label}
                  </option>
                ))}
              </select>
              <ChevronRight
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none"
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
              {t.roles[role].blurb}
            </p>
          </div>
        )}

        {mode === "register" && (
          <div>
            <label className="block text-sm font-semibold text-[#1e3a5f] mb-1.5">
              {t.fullName}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.fullNamePh}
              className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40 focus:border-[#1e3a5f]"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-[#1e3a5f] mb-1.5">
            {t.emailLabel}
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
              placeholder={t.emailPh}
              className="w-full pl-10 pr-3.5 py-3 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40 focus:border-[#1e3a5f]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1e3a5f] mb-1.5">
            {t.password}
          </label>
          <div className="relative">
            <Lock
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type={showPwd ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPh}
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

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="group w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#1e3a5f]/25 hover:bg-[#24466f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy
            ? t.pleaseWait
            : mode === "login"
              ? t.login
              : t.registerAs.replace("{role}", t.roles[role].label)}
          <ArrowRight
            size={15}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        {mode === "login" ? (
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className="text-slate-600"
          >
            {t.newHere}{" "}
            <span className="font-semibold text-[#0f766e] hover:underline">
              {t.registerLink}
            </span>
          </button>
        ) : (
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className="text-slate-600"
          >
            {t.already}{" "}
            <span className="font-semibold text-[#0f766e] hover:underline">
              {t.loginLink}
            </span>
          </button>
        )}
        <button className="font-medium text-slate-500 hover:text-slate-700">
          {t.forgot}
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
            {t.learnTitle}
          </div>
          <div className="text-[11px] text-slate-500">{t.learnSub}</div>
        </div>
        <ChevronRight size={18} className="text-slate-400" />
      </button>
    </div>
  );
}
