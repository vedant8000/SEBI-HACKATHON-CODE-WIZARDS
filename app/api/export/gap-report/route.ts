import { NextResponse } from "next/server";
import { getContext } from "@/lib/server/context";

/** Gap Report as CSV. */
export async function GET() {
  const { company, analysis } = await getContext();
  const gaps = analysis?.gaps ?? [];
  const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Title", "Severity", "Affected Section", "Explanation", "Required Document", "Suggested Fix", "Owner", "Status"].join(","),
    ...gaps.map((g) =>
      [g.title, g.severity, g.affectedSection, g.explanation, g.requiredDocument, g.suggestedFix, g.owner, g.status].map(esc).join(",")),
  ].join("\r\n");
  return new NextResponse(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gap-report-${(company?.name ?? "company").replace(/\W+/g, "-").toLowerCase()}.csv"`,
    },
  });
}
