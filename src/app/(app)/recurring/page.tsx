import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { formatCurrency, formatDateShort, cn } from "@/lib/utils";
import {
  getRecurringTemplates,
  getPendingRecurringDrafts,
  ensureRecurringGenerated,
  confirmRecurringDraft,
  toggleRecurringActive,
  deleteRecurringTemplate,
} from "@/actions/recurring";
import { deleteOrders } from "@/actions/orders";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function decodeDays(mask: number): string {
  if (mask === 127) return "Daily";
  if (mask === 0b0111110) return "Weekdays";
  if (mask === 0b1000001) return "Weekends";
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (mask & (1 << i)) out.push(DAY_FULL[i]);
  }
  return out.join(", ") || "—";
}

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  // Idempotent — generate any missing days for today.
  await ensureRecurringGenerated();

  const { tab } = await searchParams;
  const activeTab = tab === "templates" ? "templates" : "today";

  const [drafts, templates] = await Promise.all([
    getPendingRecurringDrafts(),
    getRecurringTemplates(),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Recurring Orders"
        description="Schedules that auto-create draft orders for confirmation"
        action={
          <Link href="/recurring/new">
            <Button>New schedule</Button>
          </Link>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-white/10">
        <nav className="-mb-px flex gap-x-6" aria-label="Tabs">
          <Link
            href="/recurring?tab=today"
            className={cn(
              "whitespace-nowrap border-b-2 py-3 text-sm font-medium",
              activeTab === "today"
                ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
            )}
          >
            Pending {drafts.length > 0 && `(${drafts.length})`}
          </Link>
          <Link
            href="/recurring?tab=templates"
            className={cn(
              "whitespace-nowrap border-b-2 py-3 text-sm font-medium",
              activeTab === "templates"
                ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
            )}
          >
            Schedules ({templates.length})
          </Link>
        </nav>
      </div>

      {activeTab === "today" && (
        <div className="space-y-3">
          {drafts.length === 0 ? (
            <EmptyState
              icon={ArrowPathIcon}
              title="Nothing pending"
              description="Auto-generated drafts will show up here for you to confirm."
            />
          ) : (
            drafts.map((d) => (
              <div
                key={d.id}
                className="rounded-lg bg-white p-4 ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {d.shopName ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      #{d.id} · {formatDateShort(d.date)} · {d.firmName ?? "—"}
                    </p>
                    <ul className="mt-2 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                      {d.items.map((it, i) => (
                        <li key={i}>
                          {it.productName ?? "—"} · {it.quantity} {it.unit ?? "kg"}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(d.total)}
                    </p>
                    <Badge color="gray">Draft</Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-white/10">
                  <form
                    action={async () => {
                      "use server";
                      await confirmRecurringDraft(d.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="cursor-pointer rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                      Confirm as Invoiced
                    </button>
                  </form>
                  <Link
                    href={`/orders/${d.id}`}
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/15"
                  >
                    Edit
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await deleteOrders([d.id]);
                    }}
                  >
                    <button
                      type="submit"
                      className="cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-200 ring-inset hover:bg-red-50 dark:text-red-400 dark:ring-red-500/30 dark:hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "templates" && (
        <div className="space-y-3">
          {templates.length === 0 ? (
            <EmptyState
              icon={ArrowPathIcon}
              title="No schedules yet"
              description="Create a schedule to auto-generate orders for a recurring client."
              action={
                <Link href="/recurring/new">
                  <Button>New schedule</Button>
                </Link>
              }
            />
          ) : (
            templates.map((t) => {
              const total = t.items.reduce(
                (s, i) => s + i.quantity * i.rate,
                0,
              );
              return (
                <div
                  key={t.id}
                  className={cn(
                    "rounded-lg bg-white p-4 ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10",
                    !t.isActive && "opacity-60",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t.shopName ?? "—"}
                        {t.name && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            · {t.name}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {t.firmName ?? "—"} · {decodeDays(t.daysOfWeek)}
                      </p>
                      <ul className="mt-2 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                        {t.items.map((it) => (
                          <li key={it.id}>
                            {it.productName ?? "—"} · {it.quantity}{" "}
                            {it.unit ?? "kg"} @ {formatCurrency(it.rate)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(total)} / run
                      </p>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <span className="inline-flex gap-0.5">
                          {DAY_LABELS.map((l, i) => (
                            <span
                              key={i}
                              className={cn(
                                "inline-flex size-4 items-center justify-center rounded text-[9px]",
                                t.daysOfWeek & (1 << i)
                                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                                  : "bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500",
                              )}
                            >
                              {l}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-white/10">
                    <Link
                      href={`/recurring/${t.id}/edit`}
                      className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/15"
                    >
                      Edit
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await toggleRecurringActive(t.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/15"
                      >
                        {t.isActive ? "Pause" : "Resume"}
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await deleteRecurringTemplate(t.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-200 ring-inset hover:bg-red-50 dark:text-red-400 dark:ring-red-500/30 dark:hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
