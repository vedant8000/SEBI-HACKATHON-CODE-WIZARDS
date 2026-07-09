import { buildComplianceCalendar } from "@/lib/reference/compliance-calendar";
import { Badge, Card, PageHeader } from "@/components/shared/ui";

export const dynamic = "force-dynamic";

export default function PostListingPage() {
  const tasks = buildComplianceCalendar();
  return (
    <>
      <PageHeader
        title="Post-Listing Compliance Calendar"
        subtitle="Listing is the start, not the finish. This preview shows the recurring obligations of a listed SME — results, shareholding patterns, disclosures — so you know what life after the IPO looks like."
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 bg-slate-50">
                <th className="px-4 py-2.5">Compliance Task</th>
                <th className="px-2 py-2.5">Regulation / Category</th>
                <th className="px-2 py-2.5">Due Date</th>
                <th className="px-2 py-2.5">Owner</th>
                <th className="px-2 py-2.5">Status</th>
                <th className="px-2 py-2.5">Reminder</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{t.task}</td>
                  <td className="px-2 py-2.5 text-slate-500">{t.category}</td>
                  <td className="px-2 py-2.5 text-slate-600">{t.dueDate}</td>
                  <td className="px-2 py-2.5 text-slate-500">{t.owner}</td>
                  <td className="px-2 py-2.5">
                    <Badge tone={t.status === "Overdue" ? "red" : t.status === "Due Soon" ? "yellow" : t.status === "Filed" ? "green" : "grey"}>{t.status}</Badge>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-slate-400">Email + dashboard (planned)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-slate-400 mt-4">
        Illustrative preview based on typical SME LODR obligations; exact requirements depend on your listing agreement and current regulations. Full automation is on the roadmap.
      </p>
    </>
  );
}
