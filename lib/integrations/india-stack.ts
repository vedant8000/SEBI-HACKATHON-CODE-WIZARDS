import type { FinancialYear } from "../types";
import type { ParsedProfile } from "../document-processing/profile-parser";

/**
 * India-Stack auto-population, SIMULATED connectors.
 *
 * In production these map to real rails: MCA21 V3 (company master + AOC-4 / XBRL
 * financials), GSTN (turnover), DigiLocker / CKYC (promoter KYC), and the Udyam
 * registry (MSME classification). Here they are mocked with realistic, clearly
 * fictional data so the auto-population UX and downstream pipeline can be
 * demonstrated end-to-end without live government API access.
 *
 * Every field carries provenance naming the SOURCE SYSTEM, so the promoter
 * reviews exactly as they would for document-based auto-fill.
 */

export interface Connector {
  system: string;
  description: string;
  status: "connected" | "unavailable";
  fetched: string[];
}

export interface IndiaStackResult extends ParsedProfile {
  connectors: Connector[];
  identifier: { cin: string; gstin: string };
  simulated: true;
}

const currentFy = () => new Date().getFullYear() + (new Date().getMonth() >= 3 ? 0 : -1);

/** Small deterministic hash so the same identifier always returns the same figures. */
function seed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

export function indiaStackPrefill(input: { cin?: string; gstin?: string; name?: string }): IndiaStackResult {
  const cin = (input.cin || "U29253MP2013PLC031288").trim().toUpperCase();
  const gstin = (input.gstin || "23AACVP1234R1Z9").trim().toUpperCase();
  const rng = seed(cin + gstin);

  // year of incorporation encoded in a real CIN (chars 9-12), else derived
  const yoyMatch = cin.match(/[A-Z]{3}(\d{4})/);
  const yearOfIncorporation = yoyMatch ? Number(yoyMatch[1]) : currentFy() - 11;
  const stateCode = gstin.slice(0, 2);
  const STATE_BY_CODE: Record<string, [string, string]> = {
    "23": ["Indore", "Madhya Pradesh"], "24": ["Ahmedabad", "Gujarat"],
    "27": ["Pune", "Maharashtra"], "06": ["Faridabad", "Haryana"], "33": ["Chennai", "Tamil Nadu"],
  };
  const [city, state] = STATE_BY_CODE[stateCode] ?? ["Indore", "Madhya Pradesh"];

  const name = input.name?.trim() || "Vindhya Precision Industries Limited";
  const promoterName = ["Rohit Mehra", "Anjali Verma", "Sanjay Iyer", "Kavita Nair"][rng % 4];

  // three-year financial snapshot from MCA AOC-4 / XBRL (fictional but coherent)
  const baseRev = 60 + (rng % 40); // ₹60–100 Cr
  const g1 = 1.18 + ((rng >> 3) % 12) / 100; // ~18–30% growth
  const g2 = 1.15 + ((rng >> 6) % 12) / 100;
  const fyN = currentFy();
  const mkFy = (fy: string, rev: number): FinancialYear => {
    const ebitdaPct = 0.12 + ((rng >> 4) % 6) / 100;
    const ebitda = +(rev * ebitdaPct).toFixed(1);
    return {
      fy,
      revenueCr: +rev.toFixed(1),
      ebitdaCr: ebitda,
      patCr: +(ebitda * 0.52).toFixed(1),
      netWorthCr: +(rev * 0.34).toFixed(1),
      borrowingsCr: +(rev * 0.28).toFixed(1),
      receivablesCr: +(rev * 0.22).toFixed(1),
      cfoCr: +(ebitda * 0.7).toFixed(1),
    };
  };
  const rev0 = baseRev, rev1 = baseRev * g1, rev2 = baseRev * g1 * g2;
  const financials = [
    mkFy(`FY${fyN - 2}`, rev0),
    mkFy(`FY${fyN - 1}`, rev1),
    mkFy(`FY${fyN}`, rev2),
  ];

  const industry = ["precision engineering & auto components", "specialty chemicals manufacturing",
    "food processing & packaging", "industrial electronics"][rng % 4];

  const profile: ParsedProfile["profile"] = {
    name, cin, industry, city, state, yearOfIncorporation,
    promoterName, promoterExperienceYears: 12 + (rng % 12),
  };

  const P = (system: string, confidence: number) => ({ sourceFile: system, confidence });
  const provenance: ParsedProfile["provenance"] = {
    name: P("MCA21 V3", 98), cin: P("MCA21 V3", 99), yearOfIncorporation: P("MCA21 V3", 97),
    city: P("MCA21 V3", 92), state: P("GSTN", 95),
    promoterName: P("DigiLocker / CKYC", 90), promoterExperienceYears: P("DigiLocker / CKYC", 72),
    industry: P("Udyam Registry", 88),
    [`fy:${financials[0].fy}`]: P("MCA21 AOC-4 / XBRL", 94),
    [`fy:${financials[1].fy}`]: P("MCA21 AOC-4 / XBRL", 94),
    [`fy:${financials[2].fy}`]: P("GSTN + MCA21", 91),
  };

  const connectors: Connector[] = [
    { system: "MCA21 V3", description: "Company master & directors", status: "connected",
      fetched: ["Legal name", "CIN", "Incorporation year", "Registered office"] },
    { system: "MCA21 AOC-4 / XBRL", description: "Filed financial statements", status: "connected",
      fetched: [`3-year financials (${financials[0].fy}–${financials[2].fy})`] },
    { system: "GSTN", description: "Turnover & registration", status: "connected",
      fetched: ["State of registration", "Latest-year turnover"] },
    { system: "DigiLocker / CKYC", description: "Promoter KYC", status: "connected",
      fetched: ["Promoter name", "Experience (indicative)"] },
    { system: "Udyam Registry", description: "MSME classification", status: "connected",
      fetched: ["Industry / activity", "MSME status"] },
  ];

  const documentsParsed = connectors.map((c) => ({
    fileName: c.system, category: c.description, readable: true, fieldsFound: c.fetched.length,
  }));

  return { profile, provenance, financials, documentsParsed, unreadable: [], connectors, identifier: { cin, gstin }, simulated: true };
}
