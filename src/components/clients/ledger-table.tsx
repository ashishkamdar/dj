import { type LedgerEntry } from "@/lib/ledger";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LedgerTableProps {
  entries: LedgerEntry[];
}

export function LedgerTable({ entries }: LedgerTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No ledger entries found for this period.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
        <thead>
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Date
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Description
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Debit
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Credit
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Balance
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {entries.map((entry, index) => (
            <tr
              key={index}
              className={cn(
                entry.type === "opening" && "bg-gray-50 dark:bg-white/5",
                entry.type === "payment" && "bg-green-50/50 dark:bg-green-900/10"
              )}
            >
              <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                {entry.type === "opening" ? "—" : formatDate(entry.date)}
              </td>
              <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                {entry.description}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-700 dark:text-gray-300">
                {entry.debit > 0 ? formatCurrency(entry.debit) : ""}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-green-700 dark:text-green-400">
                {entry.credit > 0 ? formatCurrency(entry.credit) : ""}
              </td>
              <td
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-right text-sm font-medium",
                  entry.balance > 0
                    ? "text-red-600 dark:text-red-400"
                    : entry.balance < 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-700 dark:text-gray-300"
                )}
              >
                {formatCurrency(Math.abs(entry.balance))}
                {entry.balance > 0 ? " Dr" : entry.balance < 0 ? " Cr" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
