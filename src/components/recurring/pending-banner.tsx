import Link from "next/link";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  ensureRecurringGenerated,
  getPendingRecurringCount,
} from "@/actions/recurring";

/**
 * Server component. Idempotently runs recurring-order generation, then
 * shows a single-line banner if there are unconfirmed auto-drafts.
 * Renders nothing when there's nothing pending — non-blocking by design.
 */
export async function RecurringPendingBanner() {
  // Generation runs once per day per tenant; cheap when already up-to-date.
  await ensureRecurringGenerated();
  const count = await getPendingRecurringCount();
  if (count === 0) return null;

  return (
    <Link
      href="/recurring?tab=today"
      className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-900 hover:bg-amber-100 sm:px-6 lg:px-8 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <ArrowPathIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {count} recurring order{count > 1 ? "s" : ""} generated · please
          confirm
        </span>
      </span>
      <span className="shrink-0 font-semibold">Confirm →</span>
    </Link>
  );
}
