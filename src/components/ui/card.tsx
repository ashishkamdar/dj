import { cn } from "@/lib/utils";

interface CardBaseProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardBaseProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:shadow-none dark:ring-white/10",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardBaseProps) {
  return (
    <div
      className={cn(
        "border-b border-gray-200 px-4 py-5 sm:px-6 dark:border-white/10",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CardBaseProps) {
  return (
    <div className={cn("px-4 py-5 sm:px-6", className)}>{children}</div>
  );
}

export function CardFooter({ children, className }: CardBaseProps) {
  return (
    <div
      className={cn(
        "border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-white/10",
        className
      )}
    >
      {children}
    </div>
  );
}
