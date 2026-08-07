"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Files,
  Link2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { ExtractedFact, FactConflict } from "@/lib/types";
import { Badge, GlassPanel, HeroBackdrop } from "@/components/shared/ui";
import { prettyLabel as pretty } from "@/lib/utils/labels";

type EvidenceView = "review" | "accepted" | "all";

const statusTone: Record<string, "green" | "yellow" | "red" | "blue"> = {
  ACCEPTED: "green",
  NEEDS_REVIEW: "yellow",
  REJECTED: "red",
  PROMOTER_EDITED: "blue",
};

const statusLabel: Record<string, string> = {
  ACCEPTED: "Accepted",
  NEEDS_REVIEW: "Needs review",
  REJECTED: "Rejected",
  PROMOTER_EDITED: "Edited · MB verify",
};

function confidenceClasses(confidence: number) {
  if (confidence >= 85) return { text: "text-emerald-700", bar: "bg-emerald-500", wash: "bg-emerald-50" };
  if (confidence >= 70) return { text: "text-amber-700", bar: "bg-amber-500", wash: "bg-amber-50" };
  return { text: "text-red-700", bar: "bg-red-500", wash: "bg-red-50" };
}

function pageReference(fact: ExtractedFact) {
  if (!fact.pageStart) return "Page not mapped";
  if (fact.pageEnd && fact.pageEnd !== fact.pageStart) return `Pages ${fact.pageStart}–${fact.pageEnd}`;
  return `Page ${fact.pageStart}`;
}

export default function FactsTable({
  facts,
  conflicts,
  chunkStats,
}: {
  facts: ExtractedFact[];
  conflicts: FactConflict[];
  chunkStats: { total: number; processed: number; failed: number };
}) {
  const router = useRouter();
  const openConflicts = conflicts.filter((conflict) => conflict.status === "OPEN");
  const conflictKeys = useMemo(
    () => new Set(openConflicts.map((conflict) => conflict.factKey)),
    [openConflicts],
  );
  const initialReviewSource = facts.find(
    (fact) => fact.status === "NEEDS_REVIEW" || fact.status === "PROMOTER_EDITED" || conflictKeys.has(fact.factKey),
  )?.sourceFileName;

  const [busy, setBusy] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ factKey: "", value: "", financialYear: "" });
  const [filter, setFilter] = useState("");
  const [view, setView] = useState<EvidenceView>("review");
  const [expandedSources, setExpandedSources] = useState<Set<string>>(
    () => new Set(initialReviewSource ? [initialReviewSource] : facts[0]?.sourceFileName ? [facts[0].sourceFileName] : []),
  );

  const acceptedCount = facts.filter((fact) => fact.status === "ACCEPTED").length;
  const rejectedCount = facts.filter((fact) => fact.status === "REJECTED").length;
  const editedCount = facts.filter((fact) => fact.status === "PROMOTER_EDITED").length;
  const needsReviewCount = facts.filter((fact) => fact.status === "NEEDS_REVIEW").length;
  const reviewQueueCount = facts.filter(
    (fact) => fact.status === "NEEDS_REVIEW" || fact.status === "PROMOTER_EDITED" || conflictKeys.has(fact.factKey),
  ).length;
  const sourceCount = new Set(facts.map((fact) => fact.sourceFileName)).size;
  const decidedCount = acceptedCount + rejectedCount;
  const decisionProgress = facts.length ? Math.round((decidedCount / facts.length) * 100) : 0;
  const averageConfidence = facts.length
    ? Math.round(facts.reduce((total, fact) => total + fact.confidence, 0) / facts.length)
    : 0;
  const chunkProgress = chunkStats.total ? Math.round((chunkStats.processed / chunkStats.total) * 100) : 0;

  const act = async (id: string, action: string, value?: string) => {
    setBusy(id);
    try {
      await fetch("/api/facts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, value }),
      });
      router.refresh();
    } finally {
      setBusy(null);
      setEditId(null);
    }
  };

  const addManual = async () => {
    if (!manual.factKey || !manual.value) return;
    setBusy("manual");
    try {
      await fetch("/api/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factKey: manual.factKey,
          value: manual.value,
          financialYear: manual.financialYear || null,
        }),
      });
      setManual({ factKey: "", value: "", financialYear: "" });
      setShowManual(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const shown = useMemo(() => {
    const search = filter.trim().toLowerCase();
    return facts.filter((fact) => {
      const inView = view === "all"
        || (view === "accepted" && fact.status === "ACCEPTED")
        || (view === "review" && (
          fact.status === "NEEDS_REVIEW"
          || fact.status === "PROMOTER_EDITED"
          || conflictKeys.has(fact.factKey)
        ));
      const matchesSearch = !search || [
        fact.factLabel,
        fact.factKey,
        fact.normalizedValue,
        fact.sourceFileName,
        fact.financialYear ?? "",
        ...fact.linkedProspectusSections,
      ].some((value) => value.toLowerCase().includes(search));
      return inView && matchesSearch;
    });
  }, [conflictKeys, facts, filter, view]);

  const sourceGroups = useMemo(() => {
    const grouped = new Map<string, ExtractedFact[]>();
    shown.forEach((fact) => {
      const existing = grouped.get(fact.sourceFileName) ?? [];
      existing.push(fact);
      grouped.set(fact.sourceFileName, existing);
    });
    return Array.from(grouped.entries()).sort(([, left], [, right]) => {
      const leftAttention = left.filter((fact) => fact.status === "NEEDS_REVIEW" || conflictKeys.has(fact.factKey)).length;
      const rightAttention = right.filter((fact) => fact.status === "NEEDS_REVIEW" || conflictKeys.has(fact.factKey)).length;
      return rightAttention - leftAttention;
    });
  }, [conflictKeys, shown]);

  const switchView = (nextView: EvidenceView) => {
    setView(nextView);
    const first = facts.find((fact) => (
      nextView === "all"
      || (nextView === "accepted" && fact.status === "ACCEPTED")
      || (nextView === "review" && (
        fact.status === "NEEDS_REVIEW"
        || fact.status === "PROMOTER_EDITED"
        || conflictKeys.has(fact.factKey)
      ))
    ));
    if (first) setExpandedSources(new Set([first.sourceFileName]));
  };

  const toggleSource = (source: string) => {
    setExpandedSources((current) => {
      const next = new Set(current);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  return (
    <HeroBackdrop className="p-4 md:p-6">
      <div className="relative space-y-5">
        <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <GlassPanel className="overflow-hidden p-5 md:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative grid h-32 w-32 shrink-0 place-items-center">
                <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden="true">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#dbeafe" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={314.16}
                    strokeDashoffset={314.16 * (1 - decisionProgress / 100)}
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-2xl font-bold text-[#15345b]">{decisionProgress}%</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">reviewed</div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                  <ShieldCheck size={15} /> Evidence control centre
                </div>
                <h2 className="mt-2 text-xl font-semibold text-[#15345b]">Turn extracted data into defensible evidence</h2>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-600">
                  Review only the exceptions, then trace every accepted value back to its document and page before drafting.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="green">{acceptedCount} accepted</Badge>
                  <Badge tone={needsReviewCount ? "yellow" : "green"}>{needsReviewCount} awaiting decision</Badge>
                  {editedCount > 0 && <Badge tone="blue">{editedCount} edited for MB check</Badge>}
                  {rejectedCount > 0 && <Badge tone="red">{rejectedCount} rejected</Badge>}
                </div>
              </div>
            </div>
          </GlassPanel>

          <div className="grid grid-cols-2 gap-3">
            <MetricTile icon={FileText} label="Extracted facts" value={facts.length} note={`${sourceCount} source document${sourceCount === 1 ? "" : "s"}`} tone="blue" />
            <MetricTile icon={Sparkles} label="Avg. confidence" value={`${averageConfidence}%`} note="Across extracted evidence" tone={averageConfidence >= 80 ? "green" : "amber"} />
            <MetricTile icon={AlertTriangle} label="Open conflicts" value={openConflicts.length} note="Cross-document mismatches" tone={openConflicts.length ? "red" : "green"} />
            <MetricTile icon={Files} label="Pages processed" value={`${chunkStats.processed}/${chunkStats.total}`} note={chunkStats.failed ? `${chunkStats.failed} extraction failures` : "Page-wise provenance"} tone={chunkStats.failed ? "red" : "blue"} />
          </div>
        </section>

        <GlassPanel className="overflow-hidden p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
              <span>Extraction health</span>
              <span className="font-semibold text-[#15345b]">{chunkProgress}%</span>
            </div>
            <div className="h-2 min-w-[180px] flex-1 overflow-hidden rounded-full bg-slate-200/80">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all" style={{ width: `${chunkProgress}%` }} />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Decisions update IPO Intelligence and the draft instantly
            </div>
          </div>
        </GlassPanel>

        {openConflicts.length > 0 && (
          <GlassPanel className="overflow-hidden !border-red-200/90 !bg-gradient-to-r !from-red-50/95 !to-white/90">
            <div className="flex items-start gap-3 border-b border-red-100 px-5 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700">
                <AlertTriangle size={18} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-red-900">Reconcile {openConflicts.length} cross-document conflict{openConflicts.length === 1 ? "" : "s"}</h3>
                <p className="mt-0.5 text-xs text-red-700">The same disclosure was found with different values. Confirm the authoritative source before drafting.</p>
              </div>
            </div>
            <div className="grid gap-3 p-4 lg:grid-cols-2">
              {openConflicts.map((conflict) => (
                <article key={conflict.id} className="rounded-xl border border-red-200 bg-white/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-800">{pretty(conflict.factKey)}</h4>
                    <Badge tone="red">Conflict</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                    <ConflictValue value={conflict.valueA} source={conflict.sourceA} />
                    <span className="self-center text-[10px] font-bold uppercase text-red-400">vs</span>
                    <ConflictValue value={conflict.valueB} source={conflict.sourceB} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-600">{conflict.explanation}</p>
                </article>
              ))}
            </div>
          </GlassPanel>
        )}

        <GlassPanel className="overflow-hidden">
          <div className="border-b border-slate-200/70 bg-white/55 px-4 py-4 md:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#15345b]">Evidence review workspace</h3>
                <p className="mt-0.5 text-xs text-slate-500">Grouped by source document so provenance stays visible without a wide spreadsheet.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1 xl:w-72">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="Search fact, value, year or source"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowManual((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <Plus size={15} /> Add manual fact
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Evidence views">
              <ViewTab active={view === "review"} label="Review queue" count={reviewQueueCount} tone="amber" onClick={() => switchView("review")} />
              <ViewTab active={view === "accepted"} label="Accepted evidence" count={acceptedCount} tone="green" onClick={() => switchView("accepted")} />
              <ViewTab active={view === "all"} label="All facts" count={facts.length} tone="blue" onClick={() => switchView("all")} />
            </div>
          </div>

          {showManual && (
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50/70 px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <Plus size={15} className="text-blue-700" />
                <h4 className="text-sm font-semibold text-blue-900">Add promoter-supplied evidence</h4>
                <span className="text-[11px] text-blue-600">Automatically flagged for professional verification</span>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Fact key">
                  <input className="evidence-input w-48" placeholder="e.g. revenueCr" value={manual.factKey} onChange={(event) => setManual({ ...manual, factKey: event.target.value })} />
                </Field>
                <Field label="Value">
                  <input className="evidence-input w-40" placeholder="Enter value" value={manual.value} onChange={(event) => setManual({ ...manual, value: event.target.value })} />
                </Field>
                <Field label="Financial year (optional)">
                  <input className="evidence-input w-32" placeholder="FY2026" value={manual.financialYear} onChange={(event) => setManual({ ...manual, financialYear: event.target.value })} />
                </Field>
                <button
                  type="button"
                  onClick={addManual}
                  disabled={busy === "manual" || !manual.factKey || !manual.value}
                  className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "manual" ? "Adding…" : "Add evidence"}
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-50/55 p-3 md:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{shown.length}</span> fact{shown.length === 1 ? "" : "s"} across <span className="font-semibold text-slate-700">{sourceGroups.length}</span> source{sourceGroups.length === 1 ? "" : "s"}
              </p>
              {sourceGroups.length > 1 && (
                <button
                  type="button"
                  onClick={() => setExpandedSources(
                    expandedSources.size === sourceGroups.length
                      ? new Set()
                      : new Set(sourceGroups.map(([source]) => source)),
                  )}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  {expandedSources.size === sourceGroups.length ? "Collapse all sources" : "Expand all sources"}
                </button>
              )}
            </div>

            {sourceGroups.length === 0 ? (
              <EmptyEvidence view={view} searching={Boolean(filter.trim())} />
            ) : (
              <div className="space-y-3">
                {sourceGroups.map(([source, sourceFacts]) => {
                  const expanded = Boolean(filter.trim()) || expandedSources.has(source);
                  const sourceReviewCount = sourceFacts.filter((fact) => fact.status === "NEEDS_REVIEW" || fact.status === "PROMOTER_EDITED").length;
                  const sourceConflicts = sourceFacts.filter((fact) => conflictKeys.has(fact.factKey)).length;
                  const sourceConfidence = Math.round(sourceFacts.reduce((total, fact) => total + fact.confidence, 0) / sourceFacts.length);

                  return (
                    <section key={source} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                      <button
                        type="button"
                        onClick={() => toggleSource(source)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left md:px-5"
                        aria-expanded={expanded}
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-50 text-blue-700">
                          <FileText size={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800" title={source}>{source}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">{sourceFacts.length} extracted fact{sourceFacts.length === 1 ? "" : "s"} · {sourceConfidence}% average confidence</span>
                        </span>
                        <span className="hidden items-center gap-2 sm:flex">
                          {sourceConflicts > 0 && <Badge tone="red">{sourceConflicts} conflict{sourceConflicts === 1 ? "" : "s"}</Badge>}
                          {sourceReviewCount > 0 && <Badge tone="yellow">{sourceReviewCount} to review</Badge>}
                          {!sourceConflicts && !sourceReviewCount && <Badge tone="green">Reviewed</Badge>}
                        </span>
                        {expanded ? <ChevronDown size={18} className="shrink-0 text-slate-400" /> : <ChevronRight size={18} className="shrink-0 text-slate-400" />}
                      </button>

                      {expanded && (
                        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-3 lg:grid-cols-2 md:p-4">
                          {sourceFacts.map((fact) => (
                            <FactCard
                              key={fact.id}
                              fact={fact}
                              hasConflict={conflictKeys.has(fact.factKey)}
                              busy={busy}
                              editId={editId}
                              editVal={editVal}
                              onEditValue={setEditVal}
                              onStartEdit={() => {
                                setEditId(fact.id);
                                setEditVal(fact.normalizedValue);
                              }}
                              onCancelEdit={() => setEditId(null)}
                              onAction={act}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </GlassPanel>
      </div>
    </HeroBackdrop>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value: string | number;
  note: string;
  tone: "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    blue: "from-blue-50 to-white border-blue-200 text-blue-700 bg-blue-100",
    green: "from-emerald-50 to-white border-emerald-200 text-emerald-700 bg-emerald-100",
    amber: "from-amber-50 to-white border-amber-200 text-amber-700 bg-amber-100",
    red: "from-red-50 to-white border-red-200 text-red-700 bg-red-100",
  }[tone];

  return (
    <GlassPanel className={`!rounded-2xl !bg-gradient-to-br p-4 ${tones}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#15345b]">{value}</p>
        </div>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${tones.split(" ").at(-1)}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 truncate text-[11px] text-slate-500" title={note}>{note}</p>
    </GlassPanel>
  );
}

function ConflictValue({ value, source }: { value: string; source: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-red-100 bg-red-50/70 p-2.5">
      <div className="truncate text-sm font-semibold text-slate-800" title={value}>{value}</div>
      <div className="mt-1 truncate text-[10px] text-slate-500" title={source}>{source}</div>
    </div>
  );
}

function ViewTab({
  active,
  label,
  count,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  tone: "amber" | "green" | "blue";
  onClick: () => void;
}) {
  const countTone = {
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
  }[tone];

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
        active
          ? "border-[#15345b] bg-[#15345b] text-white shadow-sm"
          : "border-slate-200 bg-white/80 text-slate-600 hover:border-blue-300 hover:text-blue-700"
      }`}
    >
      {label}
      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/15 text-white" : countTone}`}>{count}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-slate-600">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function FactCard({
  fact,
  hasConflict,
  busy,
  editId,
  editVal,
  onEditValue,
  onStartEdit,
  onCancelEdit,
  onAction,
}: {
  fact: ExtractedFact;
  hasConflict: boolean;
  busy: string | null;
  editId: string | null;
  editVal: string;
  onEditValue: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onAction: (id: string, action: string, value?: string) => Promise<void>;
}) {
  const confidence = confidenceClasses(fact.confidence);
  const disabled = busy !== null;
  const rejected = fact.status === "REJECTED";

  return (
    <article className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
      hasConflict ? "border-red-200" : fact.status === "NEEDS_REVIEW" ? "border-amber-200" : "border-slate-200"
    } ${rejected ? "opacity-60" : ""}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${
        hasConflict ? "bg-red-500" : fact.status === "ACCEPTED" ? "bg-emerald-500" : fact.status === "PROMOTER_EDITED" ? "bg-blue-500" : fact.status === "REJECTED" ? "bg-slate-400" : "bg-amber-500"
      }`} />

      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-800">{pretty(fact.factLabel)}</h4>
            {hasConflict && <Badge tone="red">Conflict</Badge>}
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">{fact.factKey}</p>
        </div>
        <Badge tone={statusTone[fact.status] ?? "grey"}>{statusLabel[fact.status] ?? fact.status}</Badge>
      </div>

      <div className="mt-4 pl-1">
        {editId === fact.id ? (
          <div className="flex items-center gap-2">
            <input
              className="h-10 min-w-0 flex-1 rounded-lg border border-blue-400 px-3 text-sm font-semibold text-slate-800 outline-none ring-2 ring-blue-100"
              value={editVal}
              onChange={(event) => onEditValue(event.target.value)}
              autoFocus
            />
            <button type="button" title="Save correction" onClick={() => onAction(fact.id, "edit", editVal)} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><Check size={16} /></button>
            <button type="button" title="Cancel edit" onClick={onCancelEdit} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={16} /></button>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="break-words text-lg font-bold text-[#15345b]">{fact.normalizedValue}</span>
            {fact.unit && <span className="text-xs text-slate-500">{fact.unit}</span>}
            {fact.financialYear && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{fact.financialYear}</span>}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 pl-1 text-[11px]">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Confidence</span>
            <span className={`font-bold ${confidence.text}`}>{fact.confidence}%</span>
          </div>
          <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${confidence.wash}`}>
            <div className={`h-full rounded-full ${confidence.bar}`} style={{ width: `${fact.confidence}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <span className="block text-slate-500">Provenance</span>
          <span className="mt-1 block font-semibold text-slate-700">{pageReference(fact)} · {fact.extractionMethod === "ai" ? "AI" : pretty(fact.extractionMethod)}</span>
        </div>
      </div>

      <div className="mt-3 flex min-h-6 flex-wrap items-center gap-1.5 pl-1">
        <Link2 size={12} className="text-slate-400" />
        {fact.linkedProspectusSections.length ? fact.linkedProspectusSections.slice(0, 2).map((section) => (
          <span key={section} className="max-w-[190px] truncate rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700" title={section}>{section}</span>
        )) : <span className="text-[10px] text-slate-400">Not yet linked to a draft section</span>}
        {fact.linkedProspectusSections.length > 2 && <span className="text-[10px] font-semibold text-blue-600">+{fact.linkedProspectusSections.length - 2}</span>}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 pl-1">
        <span className="text-[10px] text-slate-400">Reviewer decision</span>
        <div className="flex items-center gap-1">
          <ActionButton label={fact.status === "ACCEPTED" ? "Accepted" : "Accept"} icon={fact.status === "ACCEPTED" ? CheckCircle2 : Check} tone="green" active={fact.status === "ACCEPTED"} disabled={disabled} onClick={() => onAction(fact.id, "accept")} />
          <ActionButton label="Correct" icon={Pencil} tone="blue" disabled={disabled} onClick={onStartEdit} />
          <ActionButton label="Reject" icon={X} tone="red" active={fact.status === "REJECTED"} disabled={disabled} onClick={() => onAction(fact.id, "reject")} />
        </div>
      </div>
    </article>
  );
}

function ActionButton({
  label,
  icon: Icon,
  tone,
  active = false,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Check;
  tone: "green" | "blue" | "red";
  active?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const tones = {
    green: active ? "border-emerald-200 bg-emerald-100 text-emerald-800" : "border-transparent text-slate-500 hover:bg-emerald-50 hover:text-emerald-700",
    blue: "border-transparent text-slate-500 hover:bg-blue-50 hover:text-blue-700",
    red: active ? "border-red-200 bg-red-100 text-red-800" : "border-transparent text-slate-500 hover:bg-red-50 hover:text-red-700",
  }[tone];

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition disabled:cursor-wait disabled:opacity-45 ${tones}`}
    >
      <Icon size={13} /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function EmptyEvidence({ view, searching }: { view: EvidenceView; searching: boolean }) {
  const copy = searching
    ? { icon: Search, title: "No matching evidence", message: "Try a broader fact name, value, year or document." }
    : view === "review"
      ? { icon: ShieldCheck, title: "Review queue is clear", message: "No unresolved or merchant-banker verification items remain." }
      : view === "accepted"
        ? { icon: CheckCircle2, title: "No accepted evidence yet", message: "Accept verified facts from the review queue to build your evidence set." }
        : { icon: FileText, title: "No facts extracted yet", message: "Upload company documents and run extraction, or add a fact manually." };
  const Icon = copy.icon;

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={22} /></span>
      <h4 className="mt-3 text-sm font-semibold text-slate-800">{copy.title}</h4>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{copy.message}</p>
    </div>
  );
}
