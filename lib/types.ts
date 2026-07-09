// ── IPO Saathi shared domain types ──────────────────────────────────────────

export type Role = "PROMOTER" | "MERCHANT_BANKER" | "LEGAL_REVIEWER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Company {
  id: string;
  name: string;
  cin: string;
  industry: string;
  city: string;
  state: string;
  yearOfIncorporation: number;
  promoterName: string;
  issueSizeCr: number;
  freshIssueCr: number;
  ofsCr: number;
  proposedListingExchange: string;
  status: string;
  financials: {
    fy: string;
    revenueCr: number;
    patCr: number;
    ebitdaCr: number;
    netWorthCr: number;
    borrowingsCr: number;
    receivablesCr: number;
    cfoCr: number;
  }[];
  top3CustomerPct: number;
  rptPurchasesCr: number;
  litigationNote: string;
}

export type DocStatus =
  | "Complete"
  | "Missing"
  | "Needs Review"
  | "Inconsistent"
  | "Pending MB Review";

export interface DocumentRecord {
  id: string;
  fileName: string;
  category: string;
  linkedSection: string;
  status: DocStatus;
  issuesFound: string[];
  uploadedBy: string;
  lastUpdated: string;
  confidence: number; // 0-100
  extractedSummary: string;
  keyEntities: string[];
  keyNumbers: string[];
}

export type CheckStatus = "pass" | "warning" | "fail" | "missing";
export type Severity = "Critical" | "High" | "Medium" | "Low";

export interface ReadinessCheck {
  id: string;
  category:
    | "Eligibility"
    | "Financial Health"
    | "Disclosure Completeness"
    | "Governance"
    | "Document Quality";
  ruleName: string;
  status: CheckStatus;
  severity: Severity;
  explanation: string;
  suggestedFix: string;
}

export type GapStatus = "Open" | "In Progress" | "Resolved" | "Waived";
export type Owner = "Promoter" | "Auditor" | "Merchant Banker" | "Legal Counsel";

export interface Gap {
  id: string;
  title: string;
  severity: Severity;
  affectedSection: string;
  explanation: string;
  requiredDocument: string;
  suggestedFix: string;
  owner: Owner;
  status: GapStatus;
}

export interface HeatmapSection {
  id: string;
  name: string;
  completionPct: number;
  missingInputs: string[];
  inconsistencies: string[];
  riskLevel: "Ready" | "Needs Clarification" | "Critical Issue" | "Missing Data";
  sourceDocs: string[];
  aiConfidence: number;
  mbApproval: "Approved" | "Pending" | "Changes Requested" | "Not Started";
}

export interface SourceRef {
  document: string;
  detail: string; // e.g. "Page 12"
}

export type SectionReviewStatus =
  | "Not Started"
  | "AI Drafted"
  | "Promoter Reviewed"
  | "MB Review Pending"
  | "Changes Requested"
  | "Approved"
  | "Final Draft Ready";

export interface DraftSection {
  id: string;
  sectionName: string;
  generatedText: string;
  confidence: number;
  status: SectionReviewStatus;
  sources: SourceRef[];
  missingData: string[];
  comments: ReviewComment[];
}

export interface ReviewComment {
  id: string;
  author: string;
  role: Role;
  comment: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  user: string;
  action: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface RptRisk {
  id: string;
  entityName: string;
  relationship: string;
  amountCr: number;
  pctOfBase: string;
  riskScore: number; // 0-100
  severity: Severity;
  reason: string;
  suggestedDisclosure: string;
  requiredEvidence: string;
}

export interface FinancialCheck {
  id: string;
  checkName: string;
  expectedValue: string;
  foundValue: string;
  difference: string;
  severity: Severity;
  explanation: string;
  suggestedFix: string;
}

export interface ObjectOfIssue {
  id: string;
  category: string;
  amountCr: number;
  percentage: number;
  evidence: string;
  warning: string | null;
  deploymentTimeline: string;
}

export interface ExchangeObservation {
  id: string;
  observation: string;
  affectedSection: string;
  severity: Severity;
  whyItMayBeAsked: string;
  suggestedResponse: string;
  requiredEvidence: string;
}

export interface Peer {
  name: string;
  exchange: string;
  revenueCr: number;
  patCr: number;
  pe: number;
  ps: number;
  evEbitda: number;
  roePct: number;
}

export interface ComplianceTask {
  id: string;
  task: string;
  category: string;
  dueDate: string;
  owner: string;
  status: "Upcoming" | "Due Soon" | "Overdue" | "Filed";
}
