// Modular scoring configuration — tune weights/rules here without touching the engine.

export const SCORING_WEIGHTS = {
  Eligibility: 0.3,
  "Financial Health": 0.2,
  "Disclosure Completeness": 0.25,
  Governance: 0.15,
  "Document Quality": 0.1,
} as const;

// pass = full, warning = half, fail = zero, missing = zero
export const STATUS_SCORE: Record<"pass" | "warning" | "fail" | "missing", number> = {
  pass: 1,
  warning: 0.5,
  fail: 0,
  missing: 0,
};

export const RPT_BANDS = [
  { max: 30, label: "Low" },
  { max: 60, label: "Medium" },
  { max: 100, label: "High" },
] as const;

export function rptBand(score: number): "Low" | "Medium" | "High" {
  return score <= 30 ? "Low" : score <= 60 ? "Medium" : "High";
}
