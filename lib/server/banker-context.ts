import { bankerCompanies, loadDb } from "../store";
import { composeCompanyContext, type AppContext } from "./context";

export interface BankerContext extends AppContext {
  /** All companies this banker has linked to (usually one). */
  linkedCompanies: { id: string; name: string; companyCode: string | null }[];
}

/**
 * Context for the merchant banker workspace. A banker only sees companies they
 * have linked to by entering the company's share code — never the promoter's
 * global "active company". `companyId` selects among multiple links.
 */
export async function getBankerContext(
  bankerEmail: string,
  companyId?: string
): Promise<BankerContext> {
  const db = await loadDb();
  const linked = bankerCompanies(db, bankerEmail);
  const company =
    (companyId ? linked.find((c) => c.id === companyId) : undefined) ?? linked[0] ?? null;
  return {
    ...composeCompanyContext(db, company),
    linkedCompanies: linked.map((c) => ({
      id: c.id,
      name: c.name,
      companyCode: c.companyCode ?? null,
    })),
  };
}
