import { getContext } from "@/lib/server/context";
import { Card, PageHeader } from "@/components/shared/ui";
import SettingsPanel from "@/components/settings/SettingsPanel";
import { activeProvider, aiAvailable, AI_SETUP_MESSAGE, geminiKeys } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { db, company } = await getContext();
  const provider = activeProvider();
  return (
    <>
      <PageHeader title="Settings" subtitle="Companies, data management and AI provider status." />
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
          <h3 className="text-sm font-semibold text-slate-800 mb-2">AI Provider</h3>
          {aiAvailable() ? (
            <p className="text-sm text-slate-600">
              Active provider: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{provider}</span>
              {provider === "gemini" && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs ml-1">{process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest"}</span>}
              {provider === "gemini" && <span className="text-xs text-slate-500 ml-1">· {geminiKeys().length} key(s) in rotation</span>}
              {" "}— document classification, chunk-wise fact extraction, draft generation and the assistant are enabled.
              {provider === "gemini" && geminiKeys().length < 2 && (
                <span className="block text-xs text-amber-700 mt-1">
                  Tip: add GEMINI_API_KEY_2 / GEMINI_API_KEY_3 in .env.local — calls rotate across keys automatically when one hits its free-tier rate limit.
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-amber-800">{AI_SETUP_MESSAGE}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            The AI extracts facts and drafts language only. Scores, gaps and red flags always come from the
            deterministic rule engine over your extracted facts — the AI never decides compliance outcomes,
            and generated drafts always require authorised intermediary review.
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
