import { redirect } from "next/navigation";

/**
 * The merchant banker review moved into the banker's own workspace.
 * (Promoters never reach this route — proxy.ts redirects them to /onboarding.)
 */
export default function MerchantReviewPage() {
  redirect("/banker/draft-review");
}
