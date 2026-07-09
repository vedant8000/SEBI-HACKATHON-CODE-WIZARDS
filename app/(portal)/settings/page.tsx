import { getContext } from "@/lib/server/context";
import { Card, PageHeader } from "@/components/shared/ui";
import SettingsPanel from "@/components/settings/SettingsPanel";
import { activeProvider, aiAvailable, AI_SETUP_MESSAGE } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const { db, company } = getContext();
  const provider = activeProvider();
  return (
    <>
      <PageHeader title="Settings" subtitle="Companies, data management and AI provider status." />
      <div className="space-y-5 max-w-3xl">
        <Card className={`p-5 ${aiAvailable() ? "border-emerald-300" : "border-amber-300 bg-amber-50"}`}>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">AI Provider</h3>
          {aiAvailable() ? (
            <p className="text-sm text-slate-600">
              Active provider: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{provider}</span>
              {provider === "gemini" && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs ml-1">{process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite"}</span>}
              {" "}— document classification, chunk-wise fact extraction, draft generation and the assistant are enabled.
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
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Roles (mock authentication for MVP)</h3>
          <table className="text-sm w-full">
            <tbody>
              {[["Promoter", "promoter@iposaathi.demo"], ["Merchant Banker", "banker@iposaathi.demo"], ["Admin", "admin@iposaathi.demo"]].map(([role, email]) => (
                <tr key={role} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-slate-700">{role}</td>
                  <td className="text-slate-500">{email}</td>
                  <td className="text-slate-400 font-mono text-xs">demo123</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-2">Role-based login is mocked; the review room simulates the merchant banker role.</p>
        </Card>
      </div>
    </>
  );
}
