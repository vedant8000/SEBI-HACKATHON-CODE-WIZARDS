import type { ComplianceTask } from "../types";

/** Post-listing compliance calendar, computed relative to today. */
export function buildComplianceCalendar(): ComplianceTask[] {
  const now = new Date();
  const inDays = (d: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().slice(0, 10);
  };
  const status = (d: number): ComplianceTask["status"] =>
    d < 0 ? "Overdue" : d <= 14 ? "Due Soon" : "Upcoming";

  const items: { task: string; category: string; days: number; owner: string }[] = [
    { task: "Half-yearly financial results (SME format)", category: "LODR — Financial Results", days: 21, owner: "CFO / Auditor" },
    { task: "Board meeting notice for results approval", category: "LODR — Board Meetings", days: 12, owner: "Company Secretary" },
    { task: "Shareholding pattern filing", category: "LODR — Shareholding", days: 9, owner: "RTA / Company Secretary" },
    { task: "Related-party disclosure (half-yearly)", category: "LODR — RPT", days: 30, owner: "CFO" },
    { task: "Investor grievance report", category: "LODR — Investor Services", days: 16, owner: "Compliance Officer" },
    { task: "Material event disclosure policy review", category: "LODR — Disclosures", days: 45, owner: "Board" },
    { task: "Annual report preparation kick-off", category: "Companies Act — Annual Report", days: 75, owner: "Company Secretary" },
    { task: "Corporate announcement — capacity expansion update", category: "Continuous Disclosure", days: 5, owner: "Promoter / CS" },
  ];

  return items.map((it, i) => ({
    id: `ct${i + 1}`,
    task: it.task,
    category: it.category,
    dueDate: inDays(it.days),
    owner: it.owner,
    status: status(it.days),
  }));
}
