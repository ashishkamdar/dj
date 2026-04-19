import { cn } from "@/lib/utils";

type BadgeColor =
  | "gray"
  | "red"
  | "yellow"
  | "green"
  | "blue"
  | "indigo"
  | "purple";

export interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
}

const dotColorClasses: Record<BadgeColor, string> = {
  gray: "fill-gray-400 dark:fill-gray-500",
  red: "fill-red-500 dark:fill-red-400",
  yellow: "fill-yellow-500 dark:fill-yellow-400",
  green: "fill-green-500 dark:fill-green-400",
  blue: "fill-blue-500 dark:fill-blue-400",
  indigo: "fill-indigo-500 dark:fill-indigo-400",
  purple: "fill-purple-500 dark:fill-purple-400",
};

export function Badge({ color = "gray", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-900 ring-1 ring-inset ring-gray-200 dark:text-white dark:ring-white/10",
        className
      )}
    >
      <svg
        viewBox="0 0 6 6"
        aria-hidden="true"
        className={cn("size-1.5", dotColorClasses[color])}
      >
        <circle r={3} cx={3} cy={3} />
      </svg>
      {children}
    </span>
  );
}
