import type { Company } from "../types";

/**
 * Peer benchmarking, calibrates the issuer's fundamentals and an indicative
 * valuation band against a small, sector-matched set of comparable listed SMEs.
 * The peer figures are illustrative reference values (not live market data); the
 * merchant banker substitutes the actual peer set for the "Basis for Issue Price".
 */

export interface PeerCompany {
  name: string;
  exchange: string;
  revenueCr: number;
  pe: number;
  evEbitda: number;
  roePct: number;
  ebitdaMarginPct: number;
  debtEquity: number;
  receivableDays: number;
}

export interface BenchmarkRow {
  metric: string;
  unit: string;
  company: number | null;
  peerMedian: number;
  verdict: "In line" | "Above peers" | "Below peers" | "No data";
  higherIsBetter: boolean;
  note: string;
}

export interface PeerBenchmark {
  sector: string;
  peers: PeerCompany[];
  rows: BenchmarkRow[];
  suggestedPe: number;
  indicativeValuationCr: number | null;
  summary: string;
}

interface SectorBucket { match: RegExp; sector: string; peers: PeerCompany[] }

const BUCKETS: SectorBucket[] = [
  {
    match: /engineer|auto|component|machin|precision|metal|fabricat|industrial/i,
    sector: "Precision engineering & auto components",
    peers: [
      { name: "Shivalik Engineering SME", exchange: "NSE Emerge", revenueCr: 102, pe: 22, evEbitda: 12, roePct: 21, ebitdaMarginPct: 18, debtEquity: 0.6, receivableDays: 62 },
      { name: "Deccan Precision Ltd", exchange: "BSE SME", revenueCr: 88, pe: 19, evEbitda: 10, roePct: 18, ebitdaMarginPct: 16, debtEquity: 0.7, receivableDays: 70 },
      { name: "Kalyani Auto Forgings SME", exchange: "NSE Emerge", revenueCr: 134, pe: 25, evEbitda: 13, roePct: 23, ebitdaMarginPct: 19, debtEquity: 0.5, receivableDays: 58 },
    ],
  },
  {
    match: /chemical|pharma|specialty|coating|polymer/i,
    sector: "Specialty chemicals",
    peers: [
      { name: "Aarti Speciality SME", exchange: "NSE Emerge", revenueCr: 120, pe: 26, evEbitda: 14, roePct: 22, ebitdaMarginPct: 21, debtEquity: 0.6, receivableDays: 75 },
      { name: "Meghmani Fine Chem SME", exchange: "BSE SME", revenueCr: 96, pe: 23, evEbitda: 12, roePct: 19, ebitdaMarginPct: 19, debtEquity: 0.8, receivableDays: 82 },
      { name: "Rossari Labs SME", exchange: "NSE Emerge", revenueCr: 145, pe: 28, evEbitda: 15, roePct: 24, ebitdaMarginPct: 22, debtEquity: 0.5, receivableDays: 68 },
    ],
  },
  {
    match: /food|agro|dairy|beverage|packag|fmcg|consumer/i,
    sector: "Food processing & packaged goods",
    peers: [
      { name: "GreenHarvest Foods SME", exchange: "NSE Emerge", revenueCr: 110, pe: 24, evEbitda: 13, roePct: 20, ebitdaMarginPct: 15, debtEquity: 0.7, receivableDays: 48 },
      { name: "Prataap Snacks SME", exchange: "BSE SME", revenueCr: 92, pe: 21, evEbitda: 11, roePct: 17, ebitdaMarginPct: 14, debtEquity: 0.9, receivableDays: 52 },
      { name: "Modern Dairy SME", exchange: "NSE Emerge", revenueCr: 128, pe: 22, evEbitda: 12, roePct: 19, ebitdaMarginPct: 13, debtEquity: 0.8, receivableDays: 40 },
    ],
  },
  {
    match: /tech|software|electronic|it|saas|digital/i,
    sector: "Technology & electronics",
    peers: [
      { name: "Cyient DLM SME", exchange: "NSE Emerge", revenueCr: 130, pe: 30, evEbitda: 16, roePct: 24, ebitdaMarginPct: 20, debtEquity: 0.3, receivableDays: 78 },
      { name: "Kaynes Tech SME", exchange: "BSE SME", revenueCr: 105, pe: 27, evEbitda: 14, roePct: 21, ebitdaMarginPct: 18, debtEquity: 0.4, receivableDays: 85 },
      { name: "Netweb Systems SME", exchange: "NSE Emerge", revenueCr: 150, pe: 32, evEbitda: 17, roePct: 26, ebitdaMarginPct: 21, debtEquity: 0.2, receivableDays: 72 },
    ],
  },
];

const GENERIC: SectorBucket = {
  match: /.*/,
  sector: "Diversified SME manufacturing",
  peers: [
    { name: "Composite SME Peer A", exchange: "NSE Emerge", revenueCr: 100, pe: 22, evEbitda: 12, roePct: 20, ebitdaMarginPct: 16, debtEquity: 0.6, receivableDays: 65 },
    { name: "Composite SME Peer B", exchange: "BSE SME", revenueCr: 90, pe: 20, evEbitda: 11, roePct: 18, ebitdaMarginPct: 15, debtEquity: 0.7, receivableDays: 72 },
    { name: "Composite SME Peer C", exchange: "NSE Emerge", revenueCr: 120, pe: 24, evEbitda: 13, roePct: 22, ebitdaMarginPct: 17, debtEquity: 0.5, receivableDays: 60 },
  ],
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

export function benchmarkCompany(company: Company): PeerBenchmark | null {
  const fin = company.financials.filter((f) => f.revenueCr != null);
  const latest = fin[fin.length - 1];
  const prior = fin[fin.length - 2];
  if (!latest) return null;

  const bucket = BUCKETS.find((b) => b.match.test(company.industry || "")) ?? GENERIC;
  const peers = bucket.peers;

  const ebitdaMargin = latest.ebitdaCr != null && latest.revenueCr ? r1((latest.ebitdaCr / latest.revenueCr) * 100) : null;
  const patMargin = latest.patCr != null && latest.revenueCr ? r1((latest.patCr / latest.revenueCr) * 100) : null;
  const roe = latest.patCr != null && latest.netWorthCr ? r1((latest.patCr / latest.netWorthCr) * 100) : null;
  const de = latest.borrowingsCr != null && latest.netWorthCr ? r1(latest.borrowingsCr / latest.netWorthCr) : null;
  const recvDays = latest.receivablesCr != null && latest.revenueCr ? Math.round((latest.receivablesCr / latest.revenueCr) * 365) : null;
  const revGrowth = prior?.revenueCr != null && latest.revenueCr != null && prior.revenueCr
    ? Math.round(((latest.revenueCr - prior.revenueCr) / prior.revenueCr) * 100) : null;

  const mkRow = (metric: string, unit: string, value: number | null, peerVals: number[], higherIsBetter: boolean, tol: number, note: string): BenchmarkRow => {
    const peerMedian = r1(median(peerVals));
    let verdict: BenchmarkRow["verdict"] = "No data";
    if (value != null) {
      const diff = value - peerMedian;
      if (Math.abs(diff) <= tol) verdict = "In line";
      else verdict = diff > 0 ? "Above peers" : "Below peers";
    }
    return { metric, unit, company: value, peerMedian, verdict, higherIsBetter, note };
  };

  const rows: BenchmarkRow[] = [
    mkRow("EBITDA margin", "%", ebitdaMargin, peers.map((p) => p.ebitdaMarginPct), true, 2,
      "Margins far above peers invite questions on sustainability; far below, on competitiveness."),
    mkRow("Return on net worth", "%", roe, peers.map((p) => p.roePct), true, 3,
      "RoNW anchors the valuation justification in the Basis for Issue Price."),
    mkRow("Debt / equity", "x", de, peers.map((p) => p.debtEquity), false, 0.15,
      "Leverage above the peer median usually needs a deleveraging narrative."),
    mkRow("Receivable days", "days", recvDays, peers.map((p) => p.receivableDays), false, 10,
      "A collection cycle well above peers is a classic reviewer query on cash quality."),
  ];

  const suggestedPe = r1(median(peers.map((p) => p.pe)));
  const indicativeValuationCr = latest.patCr != null && latest.patCr > 0 ? r1(latest.patCr * suggestedPe) : null;

  const outliers = rows.filter((row) => row.verdict === "Above peers" || row.verdict === "Below peers").length;
  const summary = revGrowth != null
    ? `Revenue grew ${revGrowth}% in ${latest.fy}. ${outliers === 0 ? "Fundamentals track the peer set closely." : `${outliers} metric(s) diverge from peers, expect the exchange to probe these.`}`
    : `${outliers === 0 ? "Fundamentals track the peer set closely." : `${outliers} metric(s) diverge from peers, expect the exchange to probe these.`}`;

  return { sector: bucket.sector, peers, rows, suggestedPe, indicativeValuationCr, summary };
}
