import Link from "next/link";
import { Check } from "lucide-react";

export interface JourneyState {
  href: string;
  label: string;
  done: boolean;
}

/**
 * Stripe-onboarding-style progress rail: shows how far the company has moved
 * through the 6-step journey. States are computed server-side from the live
 * datastore, so it doubles as a demo narrative device.
 */
export default function JourneyStepper({ steps }: { steps: JourneyState[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <div className="bg-[#fdfcf9] border-b border-stone-200 px-6 py-2 no-print overflow-x-auto">
      <div className="flex items-center gap-1 max-w-[1400px] mx-auto min-w-[720px]">
        {steps.map((s, i) => (
          <div key={s.href} className="flex items-center flex-1 min-w-0">
            <Link href={s.href} className="group flex items-center gap-1.5 min-w-0">
              <span className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors ${
                s.done
                  ? "bg-gradient-to-br from-emerald-500 to-teal-400 text-white"
                  : "bg-stone-200 text-stone-500 group-hover:bg-stone-300"
              }`}>
                {s.done ? <Check size={10} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`text-[11px] truncate transition-colors ${s.done ? "text-slate-700 font-medium" : "text-slate-400 group-hover:text-slate-600"}`}>
                {s.label}
              </span>
            </Link>
            {i < steps.length - 1 && (
              <span className={`flex-1 h-px mx-2 ${steps[i + 1].done || s.done ? "bg-emerald-200" : "bg-stone-200"}`} />
            )}
          </div>
        ))}
        <span className="text-[10px] text-slate-400 shrink-0 pl-2">{doneCount}/{steps.length} done</span>
      </div>
    </div>
  );
}
