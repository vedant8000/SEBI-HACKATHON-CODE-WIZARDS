import { getContext } from "@/lib/server/context";
import { Card, PageHeader } from "@/components/shared/ui";
import SettingsPanel from "@/components/settings/SettingsPanel";
import Tr from "@/components/i18n/Tr";
import { activeProvider, aiAvailable, AI_SETUP_MESSAGE, geminiKeys } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { db, company } = await getContext();
  const provider = activeProvider();
  return (
    <>
      <PageHeader title={<Tr id="settings.title" />} subtitle={<Tr id="settings.subtitle" />} />
      <div className="space-y-5 max-w-3xl">
        {company?.companyCode && (
          <Card className="p-5 border-blue-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Merchant banker access</h3>
            <p className="text-sm text-slate-600">
              Share this company code with your merchant banker:{" "}
              <span className="font-mono font-bold text-[#1e3a5f] tracking-widest bg-blue-50 border border-blue-200 rounded px-2 py-0.5">{company.companyCode}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1.5">
              They enter it in their SIIM banker workspace to get review access to your documents, extracted facts,
              issues and draft — and to send you correction flags.
              {(company.bankerEmails?.length ?? 0) > 0 && (
                <> Linked banker{company.bankerEmails!.length > 1 ? "s" : ""}: {company.bankerEmails!.join(", ")}.</>
              )}
            </p>
          </Card>
        )}
        <Card className={`p-5 ${aiAvailable() ? "border-emerald-300" : "border-amber-300 bg-amber-50"}`}>
          <h3 className="text-sm font-semibold text-slate-800 mb-2"><Tr id="settings.aiProvider" /></h3>
          {aiAvailable() ? (
            <p className="text-sm text-slate-600">
              <Tr id="settings.activeProvider" /> <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{provider}</span>
              {provider === "gemini" && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs ml-1">{process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest"}</span>}
              {provider === "gemini" && <span className="text-xs text-slate-500 ml-1">· {geminiKeys().length} <Tr id="settings.keysInRotation" /></span>}
              <Tr id="settings.providerEnabled" />
              {provider === "gemini" && geminiKeys().length < 2 && (
                <span className="block text-xs text-amber-700 mt-1">
                  <Tr id="settings.rotationTip" />
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-amber-800">{AI_SETUP_MESSAGE}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            <Tr id="settings.aiNote" />
          </p>
        </Card>
        <SettingsPanel
          companies={db.companies.map((c) => ({ id: c.id, name: c.name }))}
          activeId={company?.id ?? null}
        />
      </div>
    </>
  );
}
