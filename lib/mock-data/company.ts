import type { Company, User } from "../types";

export const demoUsers: User[] = [
  { id: "u1", name: "Rajesh Patel", email: "promoter@iposaathi.demo", role: "PROMOTER" },
  { id: "u2", name: "Anita Deshmukh", email: "banker@iposaathi.demo", role: "MERCHANT_BANKER" },
  { id: "u3", name: "Adv. K. Iyer", email: "legal@iposaathi.demo", role: "LEGAL_REVIEWER" },
  { id: "u4", name: "Admin", email: "admin@iposaathi.demo", role: "ADMIN" },
];

export const demoCompany: Company = {
  id: "c1",
  name: "Shakti Precision Components Private Limited",
  cin: "U29253GJ2014PTC081234",
  industry: "Auto Components Manufacturing",
  city: "Rajkot",
  state: "Gujarat",
  yearOfIncorporation: 2014,
  promoterName: "Rajesh Patel",
  issueSizeCr: 32,
  freshIssueCr: 27,
  ofsCr: 5,
  proposedListingExchange: "NSE Emerge / BSE SME",
  status: "Draft Preparation",
  financials: [
    { fy: "FY2023", revenueCr: 31.5, patCr: 1.8, ebitdaCr: 4.1, netWorthCr: 9.2, borrowingsCr: 8.6, receivablesCr: 5.1, cfoCr: 2.2 },
    { fy: "FY2024", revenueCr: 38.7, patCr: 2.4, ebitdaCr: 5.3, netWorthCr: 11.6, borrowingsCr: 9.9, receivablesCr: 6.2, cfoCr: 2.6 },
    { fy: "FY2025", revenueCr: 52.4, patCr: 3.2, ebitdaCr: 7.1, netWorthCr: 14.6, borrowingsCr: 11.8, receivablesCr: 10.7, cfoCr: 1.4 },
  ],
  top3CustomerPct: 48,
  rptPurchasesCr: 3.4,
  litigationNote: "One GST demand notice of ₹18 lakh pending",
};
