// ── SIIM shared domain types ──────────────────────────────────────────

export type Role = "PROMOTER" | "MERCHANT_BANKER" | "LEGAL_REVIEWER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface FinancialYear {
  fy: string; // e.g. "FY2025"
  revenueCr: number | null;
  patCr: number | null;
  ebitdaCr: number | null;
  netWorthCr: number | null;
  borrowingsCr: number | null;
  receivablesCr: number | null;
  cfoCr: number | null; // cash flow from operations
}

export interface Company {
  id: string;
  name: string;
  cin: string;
  industry: string;
  city: string;
  state: string;
  yearOfIncorporation: number | null;
  promoterName: string;
  promoterExperienceYears: number | null;
  issueSizeCr: number | null;
  freshIssueCr: number | null;
  ofsCr: number | null;
  proposedListingExchange: string;
  status: string;
  financials: FinancialYear[]; // oldest → latest
  top3CustomerPct: number | null;
  independentDirectorsAppointed: boolean | null;
  auditCommitteeConstituted: boolean | null;
  pendingLitigationNote: string; // promoter's own declaration text
  createdAt: string;
  /** Email of the promoter account that owns this company (lower-case). */
  ownerEmail?: string;
  /** Share code the merchant banker enters to link to this company (e.g. "SIIM-7K2M4X"). */
  companyCode?: string;
  /** Emails of merchant bankers who linked via the company code (lower-case). */
  bankerEmails?: string[];
}

export type DocStatus =
  | "Complete"
  | "Missing"
  | "Needs Review"
  | "Inconsistent"
  | "Pending MB Review";

/**
 * Structured fields the extraction engine tries to read from each document.
 * Uploaded documents get these from regex/AI extraction; the promoter can
 * correct them manually if the file was scanned or unreadable.
 */
export interface ExtractedFields {
  fy?: string;
  revenueCr?: number;
  patCr?: number;
  ebitdaCr?: number;
  netWorthCr?: number;
  borrowingsCr?: number;
  receivablesCr?: number;
  cfoCr?: number;
  gstTurnoverCr?: number;
  gstin?: string;
  cin?: string;
  din?: string;
  pan?: string;
  litigationDeclared?: string; // e.g. "NIL" or free text
  demandNoticeCr?: number; // tax/regulatory demand amount found
  quotationAmountCr?: number;
  quotationHasGstin?: boolean;
  wcRequirementCr?: number;
  rptPurchasesCr?: number;
  rptEntityNames?: string[];
  promoterLoanCr?: number;
  leaseValidTill?: string;
  boardResolutionDate?: string;
  authorisedCapitalCr?: number;
  [key: string]: unknown;
}

/** One structural signal from the document-authenticity forensics. */
export interface AuthenticitySignal {
  id: string;
  label: string;
  level: "info" | "review" | "flag";
  detail: string;
}

/**
 * Document-authenticity forensics: a deterministic, structural tamper check on a
 * PDF's raw bytes (incremental edits, modified-after-creation, editor tools, no
 * text layer, digital signature). Probabilistic "signs warranting review", never
 * a claim that a document is forged.
 */
export interface DocumentAuthenticity {
  applicable: boolean;
  score: number;            // 0-100 (100 = no structural concerns)
  level: "clean" | "review" | "flag" | "na";
  summary: string;
  signals: AuthenticitySignal[];
  checkedAt: string;
}

export interface DocumentRecord {
  id: string;
  companyId: string;
  fileName: string;
  fileType: string;
  sizeKb: number;
  category: string; // classified category
  linkedSection: string; // offer-document section it feeds
  status: DocStatus;
  issuesFound: string[];
  uploadedBy: string;
  lastUpdated: string;
  confidence: number; // 0-100 extraction confidence
  extractedText: string; // raw text (truncated for storage)
  extractedSummary: string;
  keyEntities: string[];
  keyNumbers: string[];
  fields: ExtractedFields;
  manualOverride?: boolean; // promoter corrected extraction
  storedPath?: string;
  /** Structural tamper-forensics result (PDF authenticity), computed at upload. */
  authenticity?: DocumentAuthenticity;
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
  detail: string;
}

export type SectionReviewStatus =
  | "Not Started"
  | "AI Drafted"
  | "Promoter Reviewed"
  | "MB Review Pending"
  | "Changes Requested"
  | "Approved"
  | "Final Draft Ready";

export interface ReviewComment {
  id: string;
  author: string;
  role: Role;
  comment: string;
  createdAt: string;
}

export interface DraftSection {
  id: string;
  companyId: string;
  sectionName: string;
  generatedText: string;
  confidence: number;
  status: SectionReviewStatus;
  sources: SourceRef[];
  missingData: string[];
  comments: ReviewComment[];
  updatedAt: string;
  /** Which engine produced the text, AI when available, else the deterministic
   *  rule-based generator (fallback when no key / rate-limited). */
  generatedBy?: "ai" | "rule-based";
}

export interface AuditLogEntry {
  id: string;
  companyId: string;
  user: string;
  action: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

/**
 * One entry in a company's tamper-evident export ledger. Each machine-readable
 * filing pack that is exported appends an entry whose `chainHash` binds its
 * `contentHash` to the previous entry's `chainHash`, so altering, reordering
 * or deleting any past export breaks every subsequent hash. Proves integrity
 * and sequence of the export history (not signer identity, that needs signing).
 */
export interface ExportLedgerEntry {
  id: string;
  companyId: string;
  seq: number;                 // 1-based sequence within the company
  artefact: string;            // e.g. "filing-pack"
  user: string;                // who exported (email or "unknown")
  readinessScore: number | null;
  contentHash: string;         // sha256 of the exported content
  prevHash: string;            // previous entry's chainHash ("GENESIS" for the first)
  chainHash: string;           // sha256 binding this entry to the previous
  timestamp: string;
}

export interface RptRisk {
  id: string;
  entityName: string;
  relationship: string;
  amountCr: number;
  pctOfBase: string;
  riskScore: number;
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
  segment: string;
  exchange: string;
  revenueCr: number;
  patCr: number;
  pe: number;
  ps: number;
  evEbitda: number;
  roePct: number;
  debtEquity: number;
}

export interface ComplianceTask {
  id: string;
  task: string;
  category: string;
  dueDate: string;
  owner: string;
  status: "Upcoming" | "Due Soon" | "Overdue" | "Filed";
}

/**
 * A single SME-IPO eligibility / structural obligation under the SEBI ICDR
 * framework (as tightened by the Dec-2024 board decision / Mar-2025 amendments).
 * Computed from the company profile + objects where the data allows, else marked
 * "Pending" as a checklist item to be ensured at the RHP stage.
 */
export interface ComplianceObligation {
  id: string;
  rule: string;         // short name, e.g. "Offer for Sale cap"
  requirement: string;  // the numeric/textual requirement
  status: "Met" | "Attention" | "Pending" | "N/A";
  detail: string;       // computed explanation
  basis: string;        // regulatory basis / effective date
}

/**
 * One earnings-quality / internal-consistency signal behind the Disclosure
 * Integrity Score. Derived from the promoter's OWN reported figures, never an
 * accusation, only a heads-up on what a reviewer will likely probe.
 */
export interface IntegritySignal {
  id: string;
  label: string;
  status: "clean" | "watch" | "flag" | "na";
  weight: number;        // max points this signal can deduct
  deduction: number;     // points actually deducted (0..weight)
  detail: string;        // plain-language finding
  whyItMatters: string;  // why a reviewer cares
  prepare: string;       // what to prepare / fix
}

/**
 * The Disclosure Integrity Score: a 0-100 read on how well the reported numbers
 * hang together, aggregated from the individual signals. Explicitly NOT fraud
 * detection, a pre-filing readiness indicator.
 */
export interface IntegrityScore {
  score: number;
  band: "Strong" | "Generally consistent" | "Several items to address" | "High scrutiny expected";
  summary: string;
  signals: IntegritySignal[];
  benford: { checked: boolean; sampleSize: number; madPct: number | null; note: string };
  disclaimer: string;
}

/** Everything the analysis engine computes for one company in one run. */
export interface AnalysisResult {
  checks: ReadinessCheck[];
  gaps: Gap[];
  heatmap: HeatmapSection[];
  rptRisks: RptRisk[];
  financialChecks: FinancialCheck[];
  observations: ExchangeObservation[];
  complianceObligations: ComplianceObligation[];
  /** Earnings-quality / internal-consistency read (optional: absent on analyses
   *  produced before this engine existed, callers should guard). */
  integrity?: IntegrityScore;
  scores: {
    overall: number;
    byCategory: Record<string, number>;
    rptScore: number;
    finConsistencyScore: number;
    draftCompletionPct: number;
    statusLine: string;
  };
  ranAt: string;
}

// ── Refactor: chunk-wise extraction & fact provenance ───────────────────────

export interface DocumentChunk {
  id: string;
  documentId: string;
  companyId: string;
  pageStart: number;
  pageEnd: number;
  text: string;
  detectedHeadings: string[];
  tokenEstimate: number;
  processingStatus: "pending" | "processed" | "failed" | "skipped";
}

export type FactStatus = "ACCEPTED" | "NEEDS_REVIEW" | "REJECTED" | "PROMOTER_EDITED";

export interface ExtractedFact {
  id: string;
  companyId: string;
  documentId: string;
  chunkId: string | null;
  factKey: string;            // canonical key, e.g. "revenueCr"
  factLabel: string;          // human label, e.g. "Revenue from operations"
  factValue: string;          // raw value as found
  normalizedValue: string;    // normalised (₹ crore / ISO date / plain)
  financialYear: string | null;
  unit: string | null;
  confidence: number;         // 0-100
  sourceFileName: string;
  pageStart: number | null;
  pageEnd: number | null;
  linkedProspectusSections: string[];
  status: FactStatus;
  extractionMethod: "pattern" | "ai" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface FactConflict {
  id: string;
  companyId: string;
  factKey: string;
  valueA: string;
  valueB: string;
  sourceA: string;
  sourceB: string;
  severity: Severity;
  explanation: string;
  status: "OPEN" | "RESOLVED";
}

// ── Banker → promoter correction flags ──────────────────────────────────────

export type FlagTargetType = "document" | "fact" | "gap" | "section" | "general";

/**
 * A correction the merchant banker pinpoints on the promoter's filing —
 * anchored to a document, extracted fact, gap or draft section. The promoter
 * sees open flags on the matching page and marks them addressed.
 */
export interface BankerFlag {
  id: string;
  companyId: string;
  targetType: FlagTargetType;
  targetId: string | null;   // id of the doc/fact/gap/section (null for general)
  targetLabel: string;       // human anchor, e.g. file name / fact label / section name
  message: string;           // what to correct and how
  severity: Severity;
  status: "OPEN" | "ADDRESSED";
  author: string;            // banker name or email
  createdAt: string;
  updatedAt: string;
}

export interface CoverageRow {
  sectionId: string;
  sectionName: string;
  parentSection: string;
  completionPct: number;
  availableFacts: string[];
  missingFacts: string[];
  sourceDocs: string[];
  avgConfidence: number;
  riskLevel: "Ready" | "Needs Clarification" | "Critical Issue" | "Missing Data";
  canGenerate: "YES" | "PARTIAL" | "NO";
  professionalReviewRequired: boolean;
}
