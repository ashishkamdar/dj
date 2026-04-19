import { cn } from "@/lib/utils";

export interface StatCardProps {
  name: string;
  value: string | number;
  unit?: string;
  className?: string;
}

export function StatCard({ name, value, unit, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-white px-4 py-5 shadow-sm ring-1 ring-black/5 sm:p-6 dark:bg-gray-800/50 dark:shadow-none dark:ring-white/10",
        className
      )}
    >
      <dt className="text-sm/6 font-medium text-gray-500 dark:text-gray-400 truncate">
        {name}
      </dt>
      <dd className="mt-2 flex items-baseline gap-x-2">
        <span className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}
